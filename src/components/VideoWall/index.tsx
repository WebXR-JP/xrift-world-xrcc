import { RigidBody } from "@react-three/rapier";
import { LiveVideoPlayer } from "@xrift/world-components";

export interface VideoWallProps {
  id: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}

const WALL_WIDTH = 10;
const WALL_HEIGHT = 5;
const WALL_THICKNESS = 0.5;

export const VideoWall: React.FC<VideoWallProps> = ({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = "#8B7355",
}) => {
  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[0, WALL_HEIGHT / 2, 0]} castShadow>
          <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshLambertMaterial color={color} />
        </mesh>
      </RigidBody>
      <LiveVideoPlayer
        id={id}
        position={[0, 2.5, 0.3]}
        rotation={[0, 0, 0]}
        width={6}
        url=""
      />
    </group>
  );
};
