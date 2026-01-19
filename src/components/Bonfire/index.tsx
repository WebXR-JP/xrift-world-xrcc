import { Fire } from '../Fire'

export interface BonfireProps {
  position?: [number, number, number]
  scale?: number
}

export const Bonfire: React.FC<BonfireProps> = ({
  position = [0, 0, 0],
  scale = 1,
}) => {
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
      {/* 光源 */}
      <pointLight
        position={[0, 0.6, 0]}
        color="#ffbba4"
        intensity={10}
        distance={40}
        decay={0.5}
        castShadow={false}
      />
    </group>
  )
}
