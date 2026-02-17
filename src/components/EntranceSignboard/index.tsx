import { TagBoard, useXRift } from "@xrift/world-components";
import { useTexture } from "@react-three/drei";
import { ProximityMirror } from "../ProximityMirror";
import { WoodenSignboard } from "../WoodenSignboard";

export interface EntranceSignboardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const EntranceSignboard: React.FC<EntranceSignboardProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  return (
    <WoodenSignboard position={position} rotation={rotation}>
      <XrccLogo position={[-0.98, 0.69, 0]} />
      <group position={[-1, -0.65, 0]} scale={0.6}>
        <TagBoard instanceStateKey="entrance-tagboard" />
      </group>
      <ProximityMirror
        position={[1.35, 0, 0]}
        size={[1.7, 2.5]}
        maxDistance={10}
      />
    </WoodenSignboard>
  );
};

const XrccLogo: React.FC<{ position?: [number, number, number] }> = ({
  position = [0, 0, 0],
}) => {
  const { baseUrl } = useXRift();
  const texture = useTexture(`${baseUrl}xrcc_logo.png`);

  return (
    <mesh position={position}>
      <planeGeometry args={[2.4, 0.96]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
};
