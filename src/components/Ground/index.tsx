import { useMemo } from 'react'
import { Color, UniformsLib, UniformsUtils } from 'three'

export interface GroundProps {
  radius: number
  color: string
  position?: [number, number, number]
  noiseScale?: number
  noiseIntensity?: number
}

const vertexShader = `
  #include <common>
  #include <fog_pars_vertex>
  #include <shadowmap_pars_vertex>

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    #include <shadowmap_vertex>
    #include <fog_vertex>

    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  #include <common>
  #include <packing>
  #include <fog_pars_fragment>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>

  uniform vec3 uColor;
  uniform float uNoiseScale;
  uniform float uNoiseIntensity;

  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

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

  // FBMノイズ（複数オクターブ）
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(st * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }

    return value;
  }

  void main() {
    // ワールド座標を使ってノイズを生成（スケール調整）
    vec2 noiseCoord = vWorldPosition.xz * uNoiseScale;

    // 複数のノイズを重ねてザラザラ感を出す
    float n1 = fbm(noiseCoord);
    float n2 = noise(noiseCoord * 10.0) * 0.3;
    float n3 = noise(noiseCoord * 30.0) * 0.15;

    float totalNoise = n1 + n2 + n3;

    // ノイズを色に適用（明暗のバリエーション、暗くなりすぎないよう調整）
    float noiseBrightness = 1.0 + (totalNoise - 0.5) * uNoiseIntensity * 0.5;
    vec3 baseColor = uColor * noiseBrightness;

    // ライティング計算
    vec3 normal = normalize(vNormal);
    vec3 worldNormal = normal; // 地面は上向きなのでワールド法線として使用

    // アンビエントライト
    vec3 lighting = ambientLightColor;

    // ポイントライト（ワールド空間で計算）
    #if NUM_POINT_LIGHTS > 0
      for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
        // ライト位置をビュー空間からワールド空間に変換
        vec3 lightWorldPos = (inverse(viewMatrix) * vec4(pointLights[i].position, 1.0)).xyz;
        vec3 lightDir = lightWorldPos - vWorldPosition;
        float lightDistance = length(lightDir);
        lightDir = normalize(lightDir);

        // 距離による減衰（decayを使用）
        float distanceFalloff = 1.0 / max(pow(lightDistance, pointLights[i].decay), 0.01);

        // 距離制限
        if (pointLights[i].distance > 0.0) {
          float distanceRatio = lightDistance / pointLights[i].distance;
          distanceFalloff *= saturate(1.0 - pow(distanceRatio, 4.0));
        }

        // ランバート拡散（ワールド空間の上向き法線を使用）
        float diff = max(dot(vec3(0.0, 1.0, 0.0), lightDir), 0.0);

        lighting += pointLights[i].color * diff * distanceFalloff;
      }
    #endif

    vec3 finalColor = baseColor * lighting;

    gl_FragColor = vec4(finalColor, 1.0);

    #include <fog_fragment>
  }
`

export const Ground: React.FC<GroundProps> = ({
  radius,
  color,
  position = [0, 0, 0],
  noiseScale = 0.5,
  noiseIntensity = 0.4,
}) => {
  const uniforms = useMemo(() => {
    const colorObj = new Color(color)
    return UniformsUtils.merge([
      UniformsLib.lights,
      UniformsLib.fog,
      {
        uColor: { value: colorObj },
        uNoiseScale: { value: noiseScale },
        uNoiseIntensity: { value: noiseIntensity },
      },
    ])
  }, [color, noiseScale, noiseIntensity])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        lights={true}
        fog={true}
      />
    </mesh>
  )
}
