export interface LanternProps {
  position?: [number, number, number]
}

export const Lantern: React.FC<LanternProps> = ({ position = [0, 0, 0] }) => {
  return (
    <group position={position}>
      {/* 柱 */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 3]} />
        <meshLambertMaterial color="#4a4a4a" />
      </mesh>
      {/* ランタン本体 */}
      <mesh position={[0, 3.2, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshBasicMaterial color="#ffaa00" />
      </mesh>
      {/* 光源 */}
      <pointLight
        position={[0, 3.2, 0]}
        color="#ffaa44"
        intensity={10}
        distance={15}
      />
    </group>
  )
}
