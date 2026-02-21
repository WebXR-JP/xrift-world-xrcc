import { useRef, useMemo, createRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'

export interface GrassProps {
  count?: number
  innerRadius: number
  outerRadius: number
  excludeAngleStart?: number
  excludeAngleEnd?: number
}

interface GrassInstance {
  x: number
  z: number
  rotation: number
  widthScale: number
  heightScale: number
  windPhase: number
  colorShift: number
}

const SECTOR_COUNT = 6
const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT // 60°
const VISIBILITY_DISTANCE = 50 // カメラからセクター中心までの表示閾値
const BEHIND_CULL_DISTANCE = 15 // この距離以上かつ背後のセクターを非表示
const BEHIND_ANGLE_THRESHOLD = Math.PI / 2 // 背後判定の角度閾値（±90°）
const LOD_NEAR_DISTANCE = 15 // この距離以内は100%描画
const LOD_FAR_DISTANCE = 45 // この距離以上は最低密度
const LOD_MIN_RATIO = 0.3 // 最遠距離での描画割合（30%）

const generateGrassInstances = (
  count: number,
  innerRadius: number,
  outerRadius: number,
  excludeAngleStart?: number,
  excludeAngleEnd?: number,
): GrassInstance[] => {
  const instances: GrassInstance[] = []
  const seed = 54321

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 7777) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(i * 2) * Math.PI * 2
    // 外側に偏らせる（1 - t³ で外側ほど密度が高い）
    const t = seededRandom(i * 2 + 1)
    const tOuter = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t)
    const radius =
      innerRadius + tOuter * (outerRadius - innerRadius)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    if (excludeAngleStart !== undefined && excludeAngleEnd !== undefined) {
      const grassAngle = Math.atan2(z, x)
      if (
        grassAngle > excludeAngleStart &&
        grassAngle < excludeAngleEnd &&
        radius > innerRadius * 0.85
      ) {
        continue
      }
    }

    // 中心からの距離の割合（0=内側、1=外側）
    const distRatio = (radius - innerRadius) / (outerRadius - innerRadius)

    instances.push({
      x,
      z,
      rotation: seededRandom(i * 4) * Math.PI * 2,
      heightScale: (0.3 + seededRandom(i * 3) * 0.4) * (0.2 + distRatio * 2.5),
      widthScale: (0.7 + seededRandom(i * 5) * 0.6) * (0.3 + distRatio * 1.5) * 0.5,
      windPhase: seededRandom(i * 6) * Math.PI * 2,
      colorShift: seededRandom(i * 7),
    })
  }
  return instances
}

/**
 * インスタンスを角度ベースで6セクターに振り分ける
 * セクター0: 0°〜60°, セクター1: 60°〜120°, ...
 */
const splitIntoSectors = (instances: GrassInstance[]): GrassInstance[][] => {
  const sectors: GrassInstance[][] = Array.from({ length: SECTOR_COUNT }, () => [])

  for (const inst of instances) {
    // カメラ方向と同じ atan2(x, z) 座標系で角度を計算（0〜2πに変換）
    let angle = Math.atan2(inst.x, inst.z)
    if (angle < 0) angle += Math.PI * 2

    const sectorIndex = Math.min(
      Math.floor(angle / SECTOR_ANGLE),
      SECTOR_COUNT - 1,
    )
    sectors[sectorIndex].push(inst)
  }

  return sectors
}

/**
 * 1本の草ブレードジオメトリ（4セグメント、10頂点、8三角形）
 * 根元が太く先端が細いテーパー形状のクアッドストリップ
 */
const createBladeGeometry = (): BufferGeometry => {
  const segments = 4
  const vertices: number[] = []
  const normals: number[] = []
  const heights: number[] = [] // vHeight 用

  const baseWidth = 0.15
  const bladeHeight = 0.35

  // 根元〜先端手前は左右2頂点のクアッドストリップ
  for (let i = 0; i < segments; i++) {
    const t = i / segments
    const y = t * bladeHeight
    const width = baseWidth * (1.0 - t)

    // 左頂点
    vertices.push(-width / 2, y, 0)
    normals.push(0, 0, 1)
    heights.push(t)

    // 右頂点
    vertices.push(width / 2, y, 0)
    normals.push(0, 0, 1)
    heights.push(t)
  }

  // 先端は中央1頂点（尖り）
  vertices.push(0, bladeHeight, 0)
  normals.push(0, 0, 1)
  heights.push(1.0)

  const indices: number[] = []
  // クアッドストリップ部分
  for (let i = 0; i < segments - 1; i++) {
    const base = i * 2
    indices.push(base, base + 1, base + 2)
    indices.push(base + 1, base + 3, base + 2)
  }
  // 最上段のクアッド → 先端の三角形
  const lastBase = (segments - 1) * 2
  const tipIndex = segments * 2
  indices.push(lastBase, lastBase + 1, tipIndex)

  const geom = new BufferGeometry()
  geom.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geom.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  geom.setAttribute('aHeight', new Float32BufferAttribute(heights, 1))
  geom.setIndex(indices)

  return geom
}

/**
 * セクター内のインスタンスから InstancedBufferGeometry を生成
 */
const createSectorGeometry = (
  bladeGeom: BufferGeometry,
  sectorInstances: GrassInstance[],
): InstancedBufferGeometry => {
  const instancedGeom = new InstancedBufferGeometry()

  // ベースジオメトリの属性をコピー
  instancedGeom.index = bladeGeom.index
  instancedGeom.setAttribute('position', bladeGeom.getAttribute('position'))
  instancedGeom.setAttribute('normal', bladeGeom.getAttribute('normal'))
  instancedGeom.setAttribute('aHeight', bladeGeom.getAttribute('aHeight'))

  // per-instance 属性
  const instanceCount = sectorInstances.length
  const offsets = new Float32Array(instanceCount * 3)
  const rotations = new Float32Array(instanceCount)
  const scales = new Float32Array(instanceCount * 2)
  const windPhases = new Float32Array(instanceCount)
  const colorShifts = new Float32Array(instanceCount)

  for (let i = 0; i < instanceCount; i++) {
    const inst = sectorInstances[i]
    offsets[i * 3] = inst.x
    offsets[i * 3 + 1] = 0
    offsets[i * 3 + 2] = inst.z
    rotations[i] = inst.rotation
    scales[i * 2] = inst.widthScale
    scales[i * 2 + 1] = inst.heightScale
    windPhases[i] = inst.windPhase
    colorShifts[i] = inst.colorShift
  }

  instancedGeom.setAttribute(
    'aOffset',
    new InstancedBufferAttribute(offsets, 3),
  )
  instancedGeom.setAttribute(
    'aRotation',
    new InstancedBufferAttribute(rotations, 1),
  )
  instancedGeom.setAttribute(
    'aScale',
    new InstancedBufferAttribute(scales, 2),
  )
  instancedGeom.setAttribute(
    'aWindPhase',
    new InstancedBufferAttribute(windPhases, 1),
  )
  instancedGeom.setAttribute(
    'aColorShift',
    new InstancedBufferAttribute(colorShifts, 1),
  )

  instancedGeom.instanceCount = instanceCount

  return instancedGeom
}

const vertexShader = `
  #include <common>
  #include <fog_pars_vertex>

  uniform float uTime;

  attribute float aHeight;

  attribute vec3 aOffset;
  attribute float aRotation;
  attribute vec2 aScale;
  attribute float aWindPhase;
  attribute float aColorShift;

  varying float vHeight;
  varying float vColorShift;
  varying float vHeightScale;
  varying vec3 vWorldPosition;

  void main() {
    vHeight = aHeight;
    vColorShift = aColorShift;
    vHeightScale = aScale.y;

    // ブレードのスケーリング
    vec3 pos = position;
    pos.x *= aScale.x;
    pos.y *= aScale.y;

    // 風アニメーション: 高さの2乗で根元固定・先端が大きく揺れる
    float heightFactor = aHeight * aHeight;
    float windStrength = 0.05 * aScale.y;
    float windX = sin(uTime * 0.5 + aWindPhase + aOffset.x * 0.3) * windStrength * heightFactor;
    float windZ = cos(uTime * 0.4 + aWindPhase + aOffset.z * 0.3) * windStrength * 0.6 * heightFactor;
    pos.x += windX;
    pos.z += windZ;

    // Y軸回転
    float cosR = cos(aRotation);
    float sinR = sin(aRotation);
    vec3 rotated = vec3(
      pos.x * cosR - pos.z * sinR,
      pos.y,
      pos.x * sinR + pos.z * cosR
    );

    // ワールド座標へオフセット
    vec3 worldPos = rotated + aOffset;
    vWorldPosition = (modelMatrix * vec4(worldPos, 1.0)).xyz;

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
  }
`

const fragmentShader = `
  #include <common>
  #include <fog_pars_fragment>
  #include <lights_pars_begin>

  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;

  varying float vHeight;
  varying float vColorShift;
  varying float vHeightScale;
  varying vec3 vWorldPosition;

  void main() {
    // 高さによる色グラデーション（短い草ほど明るい色寄り）
    float gradientStrength = smoothstep(0.0, 1.5, vHeightScale);
    vec3 midColor = mix(uBaseColor, uTipColor, 0.55);
    vec3 grassColor = mix(midColor, mix(uBaseColor, uTipColor, vHeight), gradientStrength);

    // per-blade の色バリエーション（暖色/寒色シフト）
    vec3 warmShift = vec3(0.06, 0.02, -0.03);
    vec3 coolShift = vec3(-0.03, 0.02, 0.04);
    grassColor += mix(warmShift, coolShift, vColorShift);

    // ライティング計算（Ground と同じパターン）
    vec3 lighting = ambientLightColor;

    #if NUM_POINT_LIGHTS > 0
      for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        vec3 lightWorldPos = (inverse(viewMatrix) * vec4(pointLights[i].position, 1.0)).xyz;
        vec3 lightDir = lightWorldPos - vWorldPosition;
        float lightDistance = length(lightDir);
        lightDir = normalize(lightDir);

        float distanceFalloff = 1.0 / max(pow(lightDistance, pointLights[i].decay), 0.01);

        if (pointLights[i].distance > 0.0) {
          float distanceRatio = lightDistance / pointLights[i].distance;
          distanceFalloff *= saturate(1.0 - pow(distanceRatio, 4.0));
        }

        // 草は上向き法線で近似
        float diff = max(dot(vec3(0.0, 1.0, 0.0), lightDir), 0.0);
        lighting += pointLights[i].color * diff * distanceFalloff;
      }
    #endif

    vec3 finalColor = grassColor * lighting;

    gl_FragColor = vec4(finalColor, 1.0);

    #include <fog_fragment>
  }
`

// useFrame 内で使い回す Vector3（GC回避）
const _cameraPos = new Vector3()
const _cameraDir = new Vector3()

export const Grass: React.FC<GrassProps> = ({
  count = 500,
  innerRadius,
  outerRadius,
  excludeAngleStart = Math.PI / 4 - Math.PI / 72,
  excludeAngleEnd = Math.PI / 4 + Math.PI / 72,
}) => {
  const materialRef = useRef<ShaderMaterial>(null)

  const sectorMeshRefs = useMemo(
    () => Array.from({ length: SECTOR_COUNT }, () => createRef<Mesh>()),
    [],
  )

  const sectors = useMemo(() => {
    const allInstances = generateGrassInstances(
      count,
      innerRadius,
      outerRadius,
      excludeAngleStart,
      excludeAngleEnd,
    )
    return splitIntoSectors(allInstances)
  }, [count, innerRadius, outerRadius, excludeAngleStart, excludeAngleEnd])

  const bladeGeom = useMemo(() => createBladeGeometry(), [])

  const sectorGeometries = useMemo(
    () => sectors.map((sectorInstances) => createSectorGeometry(bladeGeom, sectorInstances)),
    [sectors, bladeGeom],
  )

  // 各セクターの元のインスタンス数を保持（LODで動的に減らす基準値）
  const sectorFullCounts = useMemo(
    () => sectorGeometries.map((geom) => geom.instanceCount),
    [sectorGeometries],
  )

  // 各セクターの重心座標（XZ平面）を事前計算
  const sectorCentroids = useMemo(() => {
    return sectors.map((sectorInstances) => {
      if (sectorInstances.length === 0) return { x: 0, z: 0 }
      let sumX = 0
      let sumZ = 0
      for (const inst of sectorInstances) {
        sumX += inst.x
        sumZ += inst.z
      }
      return { x: sumX / sectorInstances.length, z: sumZ / sectorInstances.length }
    })
  }, [sectors])

  const uniforms = useMemo(
    () =>
      UniformsUtils.merge([
        UniformsLib.lights,
        UniformsLib.fog,
        {
          uTime: { value: 0 },
          uBaseColor: { value: new Color('#1a5c1a') },
          uTipColor: { value: new Color('#4aad4a') },
        },
      ]),
    [],
  )

  useFrame((state, delta) => {
    // uTime 更新
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }

    // カメラのワールド位置と視線方向を取得
    state.camera.getWorldPosition(_cameraPos)
    state.camera.getWorldDirection(_cameraDir)

    // 各セクターの可視性 + 距離LODを判定
    for (let i = 0; i < SECTOR_COUNT; i++) {
      const mesh = sectorMeshRefs[i].current
      if (!mesh) continue

      const geom = sectorGeometries[i]
      const centroid = sectorCentroids[i]
      const dx = centroid.x - _cameraPos.x
      const dz = centroid.z - _cameraPos.z
      const distSq = dx * dx + dz * dz

      // 距離閾値を超えたら非表示
      if (distSq >= VISIBILITY_DISTANCE * VISIBILITY_DISTANCE) {
        mesh.visible = false
        continue
      }

      // 近いセクターはそのまま表示
      if (distSq < BEHIND_CULL_DISTANCE * BEHIND_CULL_DISTANCE) {
        mesh.visible = true
      } else {
        // 中〜遠距離：カメラの背後なら非表示
        const dot = dx * _cameraDir.x + dz * _cameraDir.z
        const dist = Math.sqrt(distSq)
        const dirLen = Math.sqrt(_cameraDir.x * _cameraDir.x + _cameraDir.z * _cameraDir.z)
        const cosAngle = dot / (dist * dirLen)
        mesh.visible = cosAngle > Math.cos(BEHIND_ANGLE_THRESHOLD)
      }

      // 距離に応じてインスタンス数を間引き
      if (mesh.visible) {
        const dist = Math.sqrt(distSq)
        let ratio = 1.0
        if (dist > LOD_NEAR_DISTANCE) {
          const t = Math.min((dist - LOD_NEAR_DISTANCE) / (LOD_FAR_DISTANCE - LOD_NEAR_DISTANCE), 1.0)
          ratio = 1.0 - t * (1.0 - LOD_MIN_RATIO)
        }
        geom.instanceCount = Math.ceil(sectorFullCounts[i] * ratio)
      }
    }
  })

  return (
    <>
      {sectorGeometries.map((geom, i) => (
        <mesh
          key={i}
          ref={sectorMeshRefs[i]}
          geometry={geom}
          frustumCulled={false}
        >
          <shaderMaterial
            ref={i === 0 ? materialRef : undefined}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            lights
            fog
            side={DoubleSide}
            depthWrite
          />
        </mesh>
      ))}
    </>
  )
}
