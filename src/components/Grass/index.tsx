import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
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

export const Grass: React.FC<GrassProps> = ({
  count = 500,
  innerRadius,
  outerRadius,
  excludeAngleStart = Math.PI / 4 - Math.PI / 72,
  excludeAngleEnd = Math.PI / 4 + Math.PI / 72,
}) => {
  const materialRef = useRef<ShaderMaterial>(null)

  const instances = useMemo(
    () =>
      generateGrassInstances(
        count,
        innerRadius,
        outerRadius,
        excludeAngleStart,
        excludeAngleEnd,
      ),
    [count, innerRadius, outerRadius, excludeAngleStart, excludeAngleEnd],
  )

  const geometry = useMemo(() => {
    const bladeGeom = createBladeGeometry()
    const instancedGeom = new InstancedBufferGeometry()

    // ベースジオメトリの属性をコピー
    instancedGeom.index = bladeGeom.index
    instancedGeom.setAttribute('position', bladeGeom.getAttribute('position'))
    instancedGeom.setAttribute('normal', bladeGeom.getAttribute('normal'))
    instancedGeom.setAttribute('aHeight', bladeGeom.getAttribute('aHeight'))

    // per-instance 属性
    const instanceCount = instances.length
    const offsets = new Float32Array(instanceCount * 3)
    const rotations = new Float32Array(instanceCount)
    const scales = new Float32Array(instanceCount * 2)
    const windPhases = new Float32Array(instanceCount)
    const colorShifts = new Float32Array(instanceCount)

    for (let i = 0; i < instanceCount; i++) {
      const inst = instances[i]
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
  }, [instances])

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

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        lights
        fog
        side={DoubleSide}
        depthWrite
      />
    </mesh>
  )
}
