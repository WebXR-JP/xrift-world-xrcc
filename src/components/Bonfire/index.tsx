import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PointLight } from "three";
import { Embers } from "../Embers";
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
      <mesh position={[-0.1, 0.09, 0]} rotation={[0, 0, -1.396263401595464]}>
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh
        position={[0.13, 0.08, -0.12]}
        rotation={[
          0.040068383955994435, -0.22338680790988402, 1.5403844138016896,
        ]}
      >
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh
        position={[0, 0.22, -0.27]}
        rotation={[
          1.3600709122278016, 0.17275230332714064, -0.3835322050492173,
        ]}
      >
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      <mesh
        position={[0, 0.18, 0.3]}
        rotation={[
          -1.2877835932700858, 0.20706166788428343, 0.22878866835220849,
        ]}
      >
        <cylinderGeometry args={[0.08, 0.1, 0.8]} />
        <meshLambertMaterial color="#4a3728" />
      </mesh>
      {/* 炎（シェーダー） */}
      <Fire scale={1.8} />
      {/* 根本のもやもや（境界を隠す） */}
      <Embers position={[0, 0, 0]} count={15} spread={0.9} size={1.4} />
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
