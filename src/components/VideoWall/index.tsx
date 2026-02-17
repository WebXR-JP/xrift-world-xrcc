import { RigidBody } from "@react-three/rapier";
import { LiveVideoPlayer, Interactable, useXRift } from "@xrift/world-components";
import { useTexture } from "@react-three/drei";

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
      <PebbleChatBanner id={`${id}-pebble-chat`} />
    </group>
  );
};

const BANNER_SIZE = 1.2;

const PebbleChatBanner: React.FC<{ id: string }> = ({ id }) => {
  const { baseUrl } = useXRift();
  const texture = useTexture(`${baseUrl}pebble_chat.png`);

  return (
    <Interactable
      id={id}
      onInteract={() => {
        window.open("https://sawa-zen.booth.pm/items/7919966", "_blank");
      }}
      interactionText="BOOTHで見る"
    >
      <mesh position={[WALL_WIDTH / 2 - BANNER_SIZE / 2 - 0.38, BANNER_SIZE / 2 + 0.7, 0.3]}>
        <planeGeometry args={[BANNER_SIZE, BANNER_SIZE]} />
        <meshBasicMaterial map={texture} />
      </mesh>
    </Interactable>
  );
};
