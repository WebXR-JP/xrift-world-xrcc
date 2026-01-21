import { Billboard } from "@react-three/drei";
import { AdditiveBlending } from "three";

export interface StreetLightProps {
  position?: [number, number, number];
}

const glowVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const glowFragmentShader = `
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUv - center) * 2.0;

    // 中心から外側へ滑らかに減衰
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    alpha = pow(alpha, 1.5);

    vec3 color = vec3(1.0, 0.98, 0.9);
    gl_FragColor = vec4(color, alpha * 0.5);
  }
`;

export const StreetLight: React.FC<StreetLightProps> = ({
  position = [0, 0, 0],
}) => {
  return (
    <group position={position}>
      {/* 柱 */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4]} />
        <meshLambertMaterial color="#3a3a3a" />
      </mesh>
      {/* ライト部分 */}
      <mesh position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color="#ffffcc"
          emissive="#ffeeaa"
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      {/* グロー（ビルボード） */}
      <Billboard position={[0, 2.6, 0]}>
        <mesh>
          <planeGeometry args={[2, 2]} />
          <shaderMaterial
            vertexShader={glowVertexShader}
            fragmentShader={glowFragmentShader}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </Billboard>
      {/* 光源 */}
      <pointLight
        position={[0, 2.6, 0]}
        color="#ffeecc"
        intensity={15}
        distance={20}
      />
    </group>
  );
};
