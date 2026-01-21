import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PointLight } from "three";
import { Fire } from "../Fire";
import { Sparks } from "../Sparks";

export interface BonfireProps {
  position?: [number, number, number];
  scale?: number;
}

export const Bonfire: React.FC<BonfireProps> = ({
  position = [0, 0, 0],
  scale = 1,
}) => {
  const lightRef = useRef<PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      const t = state.clock.elapsedTime;
      // 複数の sin を重ねて自然なゆらぎを作る
      const flicker =
        Math.sin(t * 3.0) * 0.3 +
        Math.sin(t * 7.0) * 0.2 +
        Math.sin(t * 13.0) * 0.1;
      lightRef.current.intensity = 5 + flicker * 0.8;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* 薪 */}
      <mesh position={[-0.3, 0.1, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh position={[0.3, 0.1, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh position={[0, 0.1, -0.3]} rotation={[Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh position={[0, 0.1, 0.3]} rotation={[-Math.PI / 6, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      {/* 炎（シェーダー） */}
      <Fire scale={1.8} />
      {/* 火の粉 */}
      <Sparks
        position={[0, 0.5, 0]}
        count={20}
        spread={0.8}
        speed={2.5}
        size={0.012}
      />
      {/* 光源 */}
      <pointLight
        ref={lightRef}
        position={[0, 0.6, 0]}
        color="#ffffff"
        intensity={5}
        distance={50}
        decay={0.5}
        castShadow={false}
      />
    </group>
  );
};
