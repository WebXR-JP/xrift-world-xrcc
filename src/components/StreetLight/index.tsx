export interface StreetLightProps {
  position?: [number, number, number]
}

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
      {/* 光源 */}
      <pointLight
        position={[0, 2.6, 0]}
        color="#ffeecc"
        intensity={15}
        distance={20}
      />
    </group>
  )
}
