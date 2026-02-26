import { useMemo, useRef, useLayoutEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface TreesProps {
  count?: number
  innerRadius: number
  outerRadius: number
  excludeAngleStart?: number
  excludeAngleEnd?: number
}

interface TreePosition {
  x: number
  z: number
  scale: number
  rotation: number
}

const SEED = 12345

const seededRandom = (i: number, seed = SEED) => {
  const x = Math.sin(seed + i * 9999) * 10000
  return x - Math.floor(x)
}

const generateTreePositions = (
  count: number,
  innerRadius: number,
  outerRadius: number,
  excludeAngleStart?: number,
  excludeAngleEnd?: number,
): TreePosition[] => {
  const positions: TreePosition[] = []

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(i * 2) * Math.PI * 2
    const radius =
      innerRadius + seededRandom(i * 2 + 1) * (outerRadius - innerRadius)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    if (excludeAngleStart !== undefined && excludeAngleEnd !== undefined) {
      const treeAngle = Math.atan2(z, x)
      if (
        treeAngle > excludeAngleStart &&
        treeAngle < excludeAngleEnd &&
        radius > innerRadius * 0.9
      ) {
        continue
      }
    }

    positions.push({
      x,
      z,
      scale: 0.7 + seededRandom(i * 3) * 0.6,
      rotation: seededRandom(i * 4) * Math.PI * 2,
    })
  }
  return positions
}

// ========== I. MarchingCubes による有機的ジオメトリ生成 ==========

/**
 * Blender の Volume ワークフローを MarchingCubes（メタボール）で再現:
 *
 * 1. ベース球内部にランダムな点を散布 (Distribute Points in Volume)
 * 2. ノイズで位置をずらす (Set Position + Noise Texture, 0.5を引いて中心維持)
 * 3. 各点にランダム半径のメタボールを配置 (Points to Volume + Random Value)
 * 4. MarchingCubes で等値面を抽出 (Volume to Mesh)
 *    → 個々の球が溶け合った滑らかで有機的なメッシュが生成される
 * 5. 表面にディテールノイズを選択的に適用 (II. 表面ディテール)
 */
const createFoliageGeometry = (variantSeed: number): BufferGeometry => {
  const rng = (i: number) => {
    const x = Math.sin(variantSeed + i * 7919) * 10000
    return x - Math.floor(x)
  }

  // 解像度の最適化: 低スペック端末を考慮して解像度を下げる
  // resolution=40 でフラットシェーディングと組み合わせれば十分な見た目
  const resolution = 16
  const dummyMat = new MeshBasicMaterial()
  const mc = new MarchingCubes(resolution, dummyMat, false, false, 20000)
  mc.isolation = 80

  // I. ポイント散布 + ノイズオフセット + ランダム半径のメタボール配置
  const blobCount = 7 + Math.floor(rng(0) * 3) // 7〜9個の塊
  for (let i = 0; i < blobCount; i++) {
    // ベース球内部に均一散布（cube root で体積均一分布）
    const theta = rng(i * 10 + 2) * Math.PI * 2
    const phi = Math.acos(2 * rng(i * 10 + 3) - 1)
    const r = Math.pow(rng(i * 10 + 4), 0.33) * 0.2

    let bx = 0.5 + r * Math.sin(phi) * Math.cos(theta)
    let by = 0.5 + r * Math.sin(phi) * Math.sin(theta) * 0.5 // Y を潰す
    let bz = 0.5 + r * Math.cos(phi)

    // ノイズで位置をずらす（0.5を引いて中心からずれないように）
    bx += (rng(i * 10 + 5) - 0.5) * 0.1
    by += (rng(i * 10 + 6) - 0.5) * 0.06
    bz += (rng(i * 10 + 7) - 0.5) * 0.1

    // 塊ごとにランダムなサイズ (Points to Volume の Radius + Random Value)
    const strength = 0.3 + rng(i * 10 + 1) * 0.5
    mc.addBall(bx, by, bz, strength, 12)
  }

  // Volume to Mesh: マーチングキューブで等値面を抽出
  mc.update()

  // ジオメトリ抽出（mc.count = 頂点数、内部バッファから必要部分をコピー）
  const srcPos = mc.geometry.getAttribute('position').array as Float32Array
  const vertCount = mc.count

  const rawGeo = new BufferGeometry()
  rawGeo.setAttribute(
    'position',
    new Float32BufferAttribute(srcPos.slice(0, vertCount * 3), 3),
  )
  // MarchingCubes は頂点非共有の三角形群（vertex soup）を出力するため、
  // mergeVertices で重複頂点を結合しインデックスジオメトリに変換する
  // → 隣接三角形が頂点を共有し、ディスプレイスメントで隙間が生じない
  const geo = mergeVertices(rawGeo)
  rawGeo.dispose()
  geo.computeVertexNormals()

  // II. 表面ディテール（葉の質感）の追加
  // 正規化済み法線を使って頂点を変位させ、葉のガサガサ感を再現
  const pos = geo.attributes.position
  const norm = geo.attributes.normal
  const mergedVertCount = pos.count
  for (let i = 0; i < mergedVertCount; i++) {
    const px = pos.getX(i)
    const py = pos.getY(i)
    const pz = pos.getZ(i)

    // Selection: Boolean 形式の閾値で選択的にディテールを適用
    // → 「ディテールが激しい部分」と「元の滑らかな部分」が混在しメリハリが出る
    const applyDetail = rng(i + 500) > 0.4
    if (!applyDetail) continue

    // 正規化済みの法線方向（単位ベクトル）
    const nx = norm.getX(i)
    const ny = norm.getY(i)
    const nz = norm.getZ(i)

    // ノイズで葉の凹凸感を出す（1レイヤーに簡略化）
    const freq = 14.0
    const n1 =
      Math.sin(px * freq + variantSeed) *
      Math.cos(py * freq * 1.1 + variantSeed * 0.7) *
      Math.sin(pz * freq * 0.9 + variantSeed * 1.3)

    const displacement = n1 * 0.07
    pos.setX(i, px + nx * displacement)
    pos.setY(i, py + ny * displacement)
    pos.setZ(i, pz + nz * displacement)
  }

  // フラットシェーディング用:
  // 1. toNonIndexed() で各面に独自の頂点を持たせる
  // 2. computeVertexNormals() で面法線を計算（頂点非共有なので各面がフラットになる）
  // → 各三角形が1色になり、パキッとしたセルシェーディングが実現される
  const flatGeo = geo.toNonIndexed()
  geo.dispose()
  flatGeo.computeVertexNormals()

  // MarchingCubes リソース解放
  dummyMat.dispose()
  mc.geometry.dispose()

  return flatGeo
}

// ========== III. アニメ調セルシェーディング ==========

const foliageVS = `
  #include <common>
  #include <fog_pars_vertex>

  uniform float uTime;
  attribute float aColorShift;

  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vColorShift;

  void main() {
    vColorShift = aColorShift;

    #ifdef USE_INSTANCING
      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
    #endif

    // 風の揺れ
    float sway = sin(uTime * 0.6 + worldPos.x * 0.3 + worldPos.z * 0.2) * 0.08;
    worldPos.x += sway;
    worldPos.z += sway * 0.5;

    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

// Shader to RGB → Color Ramp (Constant)
const foliageFS = `
  #include <common>
  #include <fog_pars_fragment>

  varying vec3 vNormal;
  varying float vColorShift;

  const vec3 COLOR_SHADOW    = vec3(0.01, 0.03, 0.01);
  const vec3 COLOR_DARK      = vec3(0.02, 0.08, 0.02);
  const vec3 COLOR_MID       = vec3(0.05, 0.14, 0.03);
  const vec3 COLOR_HIGHLIGHT = vec3(0.09, 0.20, 0.05);

  void main() {
    vec3 normal = normalize(vNormal);

    vec3 lightDir = normalize(vec3(0.5, 0.6, 0.4));
    float NdotL = dot(normal, lightDir) * 0.5 + 0.5;

    vec3 cel;
    if (NdotL < 0.3) cel = COLOR_SHADOW;
    else if (NdotL < 0.5) cel = COLOR_DARK;
    else if (NdotL < 0.7) cel = COLOR_MID;
    else cel = COLOR_HIGHLIGHT;

    cel += mix(vec3(0.01, 0.005, -0.005), vec3(-0.005, 0.01, 0.005), vColorShift);

    gl_FragColor = vec4(cel, 1.0);
    #include <fog_fragment>
  }
`

const trunkVS = `
  #include <common>
  #include <fog_pars_vertex>

  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    #ifdef USE_INSTANCING
      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
    #endif

    vWorldPosition = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const trunkFS = `
  #include <common>
  #include <fog_pars_fragment>
  varying vec3 vNormal;

  const vec3 TRUNK_DARK  = vec3(0.06, 0.03, 0.02);
  const vec3 TRUNK_LIGHT = vec3(0.14, 0.09, 0.05);

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.5, 0.6, 0.4));
    float NdotL = dot(normal, lightDir) * 0.5 + 0.5;

    vec3 col = NdotL > 0.5 ? TRUNK_LIGHT : TRUNK_DARK;

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`

// ========== IV. バリエーションと仕上げ ==========

// シード値の外部出力: コピーした木がすべて異なる形状
const VARIANT_COUNT = 4

export const Trees: React.FC<TreesProps> = ({
  count = 160,
  innerRadius,
  outerRadius,
  excludeAngleStart = Math.PI / 8,
  excludeAngleEnd = (Math.PI * 3) / 8,
}) => {
  const foliageRefs = useRef<(InstancedMesh | null)[]>([])
  const trunkRef = useRef<InstancedMesh>(null)

  const treePositions = useMemo(
    () =>
      generateTreePositions(
        count,
        innerRadius,
        outerRadius,
        excludeAngleStart,
        excludeAngleEnd,
      ),
    [count, innerRadius, outerRadius, excludeAngleStart, excludeAngleEnd],
  )

  // 4バリアントの樹冠ジオメトリ（異なるシードで異なる有機的形状）
  const foliageGeos = useMemo(
    () =>
      Array.from({ length: VARIANT_COUNT }, (_, i) =>
        createFoliageGeometry(SEED + i * 1000),
      ),
    [],
  )

  const trunkGeo = useMemo(() => new CylinderGeometry(0.15, 0.3, 2.4, 8), [])

  const foliageMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: foliageVS,
        fragmentShader: foliageFS,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          { uTime: { value: 0 } },
        ]),
        fog: true,
      }),
    [],
  )

  const trunkMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: trunkVS,
        fragmentShader: trunkFS,
        uniforms: UniformsUtils.merge([UniformsLib.fog]),
        fog: true,
      }),
    [],
  )

  // 木をバリアントごとにグループ分け（Object Info Random でランダム割り当て）
  const variantGroups = useMemo(() => {
    const groups: TreePosition[][] = Array.from(
      { length: VARIANT_COUNT },
      () => [],
    )
    treePositions.forEach((tree, i) => {
      const v = Math.floor(seededRandom(i * 5 + 200) * VARIANT_COUNT)
      groups[v].push(tree)
    })
    return groups
  }, [treePositions])

  // インスタンス行列セットアップ
  useLayoutEffect(() => {
    const tMesh = trunkRef.current
    if (!tMesh) return

    const mat = new Matrix4()
    const pos = new Vector3()
    const quat = new Quaternion()
    const scl = new Vector3()
    const yAxis = new Vector3(0, 1, 0)

    // 各バリアントの葉インスタンスをセットアップ
    variantGroups.forEach((group, vi) => {
      const fMesh = foliageRefs.current[vi]
      if (!fMesh) return

      const colorShifts = new Float32Array(group.length)
      group.forEach((tree, gi) => {
        const s = tree.scale
        // MarchingCubes出力は原点中心（約 -0.5〜0.6 範囲）なので
        // スケールで樹冠サイズに拡大し、幹の上に配置
        pos.set(tree.x, 3.0 * s, tree.z)
        quat.setFromAxisAngle(yAxis, tree.rotation)
        scl.set(s * 5.0, s * 4.5, s * 5.0)
        mat.compose(pos, quat, scl)
        fMesh.setMatrixAt(gi, mat)

        // Hue/Saturation バリエーション
        colorShifts[gi] = seededRandom(gi * 7 + vi * 100 + 5)
      })

      fMesh.geometry.setAttribute(
        'aColorShift',
        new InstancedBufferAttribute(colorShifts, 1),
      )
      fMesh.instanceMatrix.needsUpdate = true
    })

    // 幹のインスタンスセットアップ
    treePositions.forEach((tree, i) => {
      const s = tree.scale
      pos.set(tree.x, 1.2 * s, tree.z)
      quat.setFromAxisAngle(yAxis, tree.rotation)
      scl.set(s, s, s)
      mat.compose(pos, quat, scl)
      tMesh.setMatrixAt(i, mat)
    })
    tMesh.instanceMatrix.needsUpdate = true
  }, [treePositions, variantGroups])

  useFrame((_, delta) => {
    foliageMat.uniforms.uTime.value += delta
  })

  return (
    <>
      {foliageGeos.map((geo, vi) => (
        <instancedMesh
          key={vi}
          ref={(el) => {
            foliageRefs.current[vi] = el
          }}
          args={[geo, foliageMat, variantGroups[vi]?.length || 0]}
          frustumCulled={false}
        />
      ))}
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, trunkMat, treePositions.length]}
        frustumCulled={false}
      />
    </>
  )
}
