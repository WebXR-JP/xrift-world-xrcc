import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mirror, useUsers } from "@xrift/world-components";
import { Group, Vector3 } from "three";

export interface ProximityMirrorProps {
  position?: [number, number, number];
  size?: [number, number];
  maxDistance?: number;
}

export const ProximityMirror: React.FC<ProximityMirrorProps> = ({
  position = [0, 0, 0],
  size = [1.5, 2],
  maxDistance = 10,
}) => {
  const { getLocalMovement } = useUsers();
  const [visible, setVisible] = useState(false);
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const movement = getLocalMovement();
    if (!movement || !groupRef.current) return;

    const userPos = new Vector3(
      movement.position.x,
      movement.position.y,
      movement.position.z
    );

    // グループのワールド座標を取得
    const mirrorWorldPos = groupRef.current.getWorldPosition(new Vector3());
    const distance = userPos.distanceTo(mirrorWorldPos);
    setVisible(distance <= maxDistance);
  });

  return (
    <group ref={groupRef} position={position}>
      {visible ? (
        <Mirror position={[0, 0, 0]} size={size} />
      ) : (
        <mesh>
          <planeGeometry args={size} />
          <meshBasicMaterial color="#636B81" />
        </mesh>
      )}
    </group>
  );
};
