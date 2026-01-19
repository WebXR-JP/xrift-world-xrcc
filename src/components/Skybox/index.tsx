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

  // 疑似乱数生成
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + .1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // 星を生成
  float stars(vec3 direction) {
    vec3 p = direction * 200.0;
    vec3 id = floor(p);
    vec3 f = fract(p);

    float star = 0.0;
    for(int x = -1; x <= 1; x++) {
      for(int y = -1; y <= 1; y++) {
        for(int z = -1; z <= 1; z++) {
          vec3 neighbor = vec3(float(x), float(y), float(z));
          vec3 cellId = id + neighbor;
          float h = hash(cellId);

          if(h > 0.985) {
            vec3 starPos = neighbor + vec3(hash(cellId + 1.0), hash(cellId + 2.0), hash(cellId + 3.0)) - f;
            float d = length(starPos);
            float brightness = 1.0 - smoothstep(0.0, 0.75, d);
            // 瞬き
            float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + h * 100.0);
            star += brightness * twinkle * (0.5 + h * 0.5);
          }
        }
      }
    }
    return star;
  }

  void main() {
    vec3 direction = normalize(vWorldPosition);

    // 空のグラデーション（下から上へ）
    float y = direction.y * 0.5 + 0.5;
    vec3 horizonColor = vec3(0.55, 0.6, 0.7);   // 地平線近くの白みがかった青（さらに白く）
    vec3 midColor = vec3(0.15, 0.22, 0.4);      // 中間の青
    vec3 topColor = vec3(0.02, 0.04, 0.12);     // 天頂の深い青

    // 地平線→中間→天頂の3段階グラデーション（白い領域をさらに広く）
    vec3 skyColor;
    if (y < 0.55) {
      skyColor = mix(horizonColor, midColor, y / 0.55);
    } else {
      skyColor = mix(midColor, topColor, (y - 0.55) / 0.45);
    }

    // 星を追加
    float starField = stars(direction);
    vec3 starColor = vec3(1.0, 0.98, 0.9); // わずかに暖かい白

    vec3 finalColor = skyColor + starColor * starField;

    gl_FragColor = vec4(finalColor, 1.0);
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
