import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { ShaderMaterial, AdditiveBlending } from 'three'

export interface FireProps {
  position?: [number, number, number]
  scale?: number
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;

  varying vec2 vUv;
  varying vec3 vPosition;

  // 疑似乱数
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  // 2Dノイズ
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
           (c - a) * u.y * (1.0 - u.x) +
           (d - b) * u.x * u.y;
  }

  // タービュランス（乱流）- 複数のノイズを重ねる（より滑らか）
  float turbulence(vec2 st) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float lacunarity = 1.8;
    float gain = 0.55;

    for (int i = 0; i < 6; i++) {
      value += amplitude * noise(st * frequency);
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value;
  }

  void main() {
    vec2 uv = vUv;

    // 中心からの距離
    float dist = length(uv - vec2(0.5, 0.5)) * 2.0;

    // 高さに応じた処理
    float height = uv.y;

    // ノイズによる揺らぎ（周波数を下げてより滑らかに）
    float noiseValue = turbulence(vec2(uv.x * 1.5, uv.y * 1.2 - uTime * 1.5));

    // 炎の形状（下が広く上が細い）
    float shape = 1.0 - smoothstep(0.0, 0.4 + noiseValue * 0.25, dist * (0.34 + height * 1.1));

    // 高さによる減衰（上に行くほど消える）
    float heightFade = 1.0 - pow(height, 0.8);

    // 下部の安定した炎（下ほど安定、上ほどノイズの影響を受ける）
    float baseFlame = smoothstep(0.0, 0.3, 1.0 - height + noiseValue * 0.5);

    // 炎の強度
    float fire = shape * heightFade * baseFlame * uIntensity;

    // 炎の色グラデーション（下から上へ：白→黄→オレンジ→赤→透明）
    vec3 col1 = vec3(1.0, 1.0, 0.9);   // 白（中心下部）
    vec3 col2 = vec3(1.0, 0.9, 0.0);   // 黄色
    vec3 col3 = vec3(1.0, 0.4, 0.0);   // オレンジ
    vec3 col4 = vec3(0.8, 0.1, 0.0);   // 赤（上部）

    vec3 fireColor;
    float t = height + noiseValue * 0.2;

    if (t < 0.25) {
      fireColor = mix(col1, col2, t * 4.0);
    } else if (t < 0.5) {
      fireColor = mix(col2, col3, (t - 0.25) * 4.0);
    } else if (t < 0.75) {
      fireColor = mix(col3, col4, (t - 0.5) * 4.0);
    } else {
      fireColor = col4;
    }

    // 中心部をより明るく
    float centerBrightness = 1.0 - dist * 0.5;
    fireColor *= centerBrightness;

    // 最終出力（Billboard用に濃くする）
    float alpha = fire * (1.0 - height * 0.3) * 1.5;
    alpha = clamp(alpha, 0.0, 1.0);

    gl_FragColor = vec4(fireColor * fire * 3.0, alpha);
  }
`

export const Fire: React.FC<FireProps> = ({ position = [0, 0, 0], scale = 1 }) => {
  const materialRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 1.5 },
    }),
    []
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <group position={position} scale={scale}>
      <Billboard position={[0, 0.6, 0]}>
        <mesh>
          <planeGeometry args={[1, 1.5, 32, 32]} />
          <shaderMaterial
            ref={materialRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Billboard>
    </group>
  )
}
