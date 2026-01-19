import { RigidBody } from '@react-three/rapier'

export interface WallProps {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
}

export const Wall: React.FC<WallProps> = ({
  position,
  size,
  color = '#8B7355',
}) => {
  return (
    <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
      <mesh position={position} castShadow>
        <boxGeometry args={size} />
        <meshLambertMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}
