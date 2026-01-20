import { useRef, useMemo } from 'react'
import { BackSide, ShaderMaterial } from 'three'
import { useFrame } from '@react-three/fiber'

export interface SkyboxProps {
  /** skyboxのサイズ（半径） */
  radius?: number
}

const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  varying vec3 vWorldPosition;
  uniform float uTime;

  // 疑似乱数生成（簡略版）
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // 星を生成（簡略版 - ループなし）
  float stars(vec3 direction) {
    // 球面座標に変換
    vec2 uv = vec2(
      atan(direction.z, direction.x) / 6.2832 + 0.5,
      asin(direction.y) / 3.1416 + 0.5
    );

    // グリッドに分割
    vec2 grid = uv * 150.0;
    vec2 id = floor(grid);
    vec2 f = fract(grid);

    float h = hash(id);

    // 星の出現確率
    if (h > 0.94) {
      // 星の位置をセル内でランダムに
      vec2 starPos = vec2(hash(id + 0.1), hash(id + 0.2));
      float d = length(f - starPos);
      float brightness = 1.0 - smoothstep(0.0, 0.07, d);
      // 簡易瞬き
      float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + h * 50.0);
      return brightness * twinkle;
    }
    return 0.0;
  }

  void main() {
    vec3 direction = normalize(vWorldPosition);

    // 空のグラデーション（地平線から天頂へ）
    // direction.y: -1(下) → 0(地平線) → 1(上)
    float height = max(direction.y + 0.1, 0.0);  // 地平線より少し下を基準に
    vec3 horizonColor = vec3(0.55, 0.6, 0.7);   // 地平線（最も明るい）
    vec3 topColor = vec3(0.02, 0.04, 0.12);     // 天頂（最も暗い）

    // pow で地平線近くの明るい領域を広く保ちつつ天頂に向かって暗くする
    float gradient = pow(height, 0.5);
    vec3 skyColor = mix(horizonColor, topColor, gradient);

    // 星を追加
    float starField = stars(direction);
    vec3 starColor = vec3(1.0, 0.98, 0.9); // わずかに暖かい白

    vec3 finalColor = skyColor + starColor * starField;

    // sRGB to Linear 変換（EffectComposer が linear 空間で処理するため）
    finalColor = pow(finalColor, vec3(2.2));

    // Bloom の影響を受けないよう 1.0 以下に clamp
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`

/**
 * Skyboxコンポーネント
 * 夜空をシェーダーで表現します
 */
export const Skybox: React.FC<SkyboxProps> = ({ radius = 500 }) => {
  const materialRef = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  )

  useFrame((_, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta
    }
  })

  return (
    <mesh>
      <sphereGeometry args={[radius, 60, 40]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={BackSide}
      />
    </mesh>
  )
}
