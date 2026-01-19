import {
  SpawnPoint,
  LiveVideoPlayer,
  ScreenShareDisplay,
} from "@xrift/world-components";
import { RigidBody } from "@react-three/rapier";
import { Instances, Instance } from "@react-three/drei";
import { useMemo } from "react";
import { BackgroundAudio } from "./components/BackgroundAudio";
import { Fire } from "./components/Fire";
import { Ground } from "./components/Ground";
import { GroundPlane } from "./components/GroundPlane";
import { Lantern } from "./components/Lantern";
import { Skybox } from "./components/Skybox";
import { COLORS, WORLD_CONFIG } from "./constants";

// 木の位置データを生成（レンガ色の床の外側、緑の床の内側）
const generateTreePositions = (
  count: number,
  innerRadius: number,
  outerRadius: number,
) => {
  const positions: { x: number; z: number; scale: number; rotation: number }[] =
    [];
  const seed = 12345;

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(i * 2) * Math.PI * 2;
    const radius =
      innerRadius + seededRandom(i * 2 + 1) * (outerRadius - innerRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // 南東の道付近（45度方向）は避ける
    const treeAngle = Math.atan2(z, x);
    if (
      treeAngle > Math.PI / 8 &&
      treeAngle < (Math.PI * 3) / 8 &&
      radius > innerRadius * 0.9
    ) {
      continue;
    }

    positions.push({
      x,
      z,
      scale: 0.7 + seededRandom(i * 3) * 0.6,
      rotation: seededRandom(i * 4) * Math.PI * 2,
    });
  }
  return positions;
};

// 草の位置データを生成
const generateGrassPositions = (
  count: number,
  innerRadius: number,
  outerRadius: number,
) => {
  const positions: { x: number; z: number; scale: number; rotation: number }[] =
    [];
  const seed = 54321; // 木とは異なるシード

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 7777) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(i * 2) * Math.PI * 2;
    const radius =
      innerRadius + seededRandom(i * 2 + 1) * (outerRadius - innerRadius);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // 南東の道付近は避ける
    const grassAngle = Math.atan2(z, x);
    if (
      grassAngle > Math.PI / 8 &&
      grassAngle < (Math.PI * 3) / 8 &&
      radius > innerRadius * 0.85
    ) {
      continue;
    }

    positions.push({
      x,
      z,
      scale: 0.3 + seededRandom(i * 3) * 0.5,
      rotation: seededRandom(i * 4) * Math.PI * 2,
    });
  }
  return positions;
};

export interface WorldProps {
  position?: [number, number, number];
  scale?: number;
}

export const World: React.FC<WorldProps> = ({
  position = [0, 0, 0],
  scale = 1,
}) => {
  const worldSize = WORLD_CONFIG.size * scale;
  const wallHeight = WORLD_CONFIG.wallHeight * scale;
  const wallThickness = WORLD_CONFIG.wallThickness * scale;

  // 木の位置を生成（160本）
  const treePositions = useMemo(
    () => generateTreePositions(160, worldSize * 1.1, worldSize * 1.9),
    [worldSize],
  );

  // 草の位置を生成（500本）
  const grassPositions = useMemo(
    () => generateGrassPositions(500, worldSize * 1.05, worldSize * 1.95),
    [worldSize],
  );

  return (
    <group position={position} scale={scale}>
      {/* Skybox - 360度パノラマ背景 */}
      <Skybox radius={500} />

      {/* BGM - 虫の鳴き声 */}
      <BackgroundAudio src="insects_sing_in_fall.mp3" volume={0.01} loop />

      {/* プレイヤーのスポーン地点（小道の先） */}
      <group position={[worldSize * 1.1, 0, worldSize * 1.1]}>
        <SpawnPoint yaw={45} />
      </group>

      {/* 照明設定 */}
      <ambientLight intensity={0.4} color="#d0d0d0" />

      {/* 地面（緑・大） */}
      <RigidBody type="fixed" colliders="trimesh" restitution={0} friction={0}>
        <Ground
          radius={worldSize * 2}
          color="#4a8f3c"
          position={[0, -0.1, 0]}
          noiseScale={0.3}
          noiseIntensity={0.5}
        />
      </RigidBody>

      {/* 木（インスタンシング） */}
      {/* 幹 */}
      <Instances limit={200}>
        <cylinderGeometry args={[0.2, 0.3, 3]} />
        <meshLambertMaterial color="#5c4033" />
        {treePositions.map((tree, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[tree.x, 1.5 * tree.scale, tree.z]}
            scale={[tree.scale, tree.scale, tree.scale]}
            rotation={[0, tree.rotation, 0]}
          />
        ))}
      </Instances>
      {/* 葉 */}
      <Instances limit={200}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshLambertMaterial color="#228b22" />
        {treePositions.map((tree, i) => (
          <Instance
            key={`leaves-${i}`}
            position={[tree.x, 3.5 * tree.scale, tree.z]}
            scale={[tree.scale, tree.scale, tree.scale]}
            rotation={[0, tree.rotation, 0]}
          />
        ))}
      </Instances>

      {/* 草（インスタンシング） */}
      <Instances limit={600}>
        <coneGeometry args={[0.15, 0.5, 4]} />
        <meshLambertMaterial color="#3cb371" />
        {grassPositions.map((grass, i) => (
          <Instance
            key={`grass-${i}`}
            position={[grass.x, 0.15 * grass.scale, grass.z]}
            scale={[grass.scale, grass.scale * 1.5, grass.scale]}
            rotation={[0, grass.rotation, 0]}
          />
        ))}
      </Instances>
      {/* 草（濃い緑） */}
      <Instances limit={600}>
        <coneGeometry args={[0.12, 0.4, 4]} />
        <meshLambertMaterial color="#228b22" />
        {grassPositions.map((grass, i) => (
          <Instance
            key={`grass2-${i}`}
            position={[grass.x + 0.1, 0.12 * grass.scale, grass.z + 0.1]}
            scale={[grass.scale * 0.8, grass.scale * 1.2, grass.scale * 0.8]}
            rotation={[0, grass.rotation + 0.5, 0]}
          />
        ))}
      </Instances>

      {/* 地面（レンガ色・円形） */}
      <RigidBody type="fixed" colliders="trimesh" restitution={0} friction={0}>
        <Ground
          radius={worldSize}
          color="#B5651D"
          position={[0, 0, 0]}
          noiseScale={0.8}
          noiseIntensity={0.4}
        />
      </RigidBody>

      {/* たき火（中央） */}
      <group position={[0, 0, 0]}>
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

      {/* 木の看板（画面共有用） */}
      <group position={[-5, 0, -5]} rotation={[0, Math.PI / 4, 0]}>
        {/* 支柱（左） */}
        <mesh position={[-1.2, 1.5, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 3]} />
          <meshLambertMaterial color="#5c4033" />
        </mesh>
        {/* 支柱（右） */}
        <mesh position={[1.2, 1.5, 0]}>
          <cylinderGeometry args={[0.1, 0.15, 3]} />
          <meshLambertMaterial color="#5c4033" />
        </mesh>
        {/* 横木（上） */}
        <mesh position={[0, 3.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.8]} />
          <meshLambertMaterial color="#5c4033" />
        </mesh>
        {/* 看板の背面（木の板） */}
        <mesh position={[0, 2, 0.19]} scale={[1.67, 1.54, 1]}>
          <boxGeometry args={[3, 2, 0.1]} />
          <meshLambertMaterial color="#8B4513" />
        </mesh>
        {/* 画面共有ディスプレイ */}
        <ScreenShareDisplay
          id="screen-share-board"
          position={[0, 2, 0.26]}
          rotation={[0, 0, 0]}
          width={4.5}
        />
      </group>

      {/* 壁（北） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[0, wallHeight / 2, -worldSize * 0.85]} castShadow>
          <boxGeometry args={[wallThickness * 20, wallHeight, wallThickness]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>

      {/* 壁（南） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[0, wallHeight / 2, worldSize * 0.85]} castShadow>
          <boxGeometry args={[wallThickness * 20, wallHeight, wallThickness]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>

      {/* 壁（東） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[worldSize * 0.85, wallHeight / 2, 0]} castShadow>
          <boxGeometry args={[wallThickness, wallHeight, wallThickness * 20]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>

      {/* 壁（西） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={[-worldSize * 0.85, wallHeight / 2, 0]} castShadow>
          <boxGeometry args={[wallThickness, wallHeight, wallThickness * 20]} />
          <meshLambertMaterial color={COLORS.wall} />
        </mesh>
      </RigidBody>

      {/* VideoPlayer（北の壁） */}
      <LiveVideoPlayer
        id="video-north"
        position={[0, 2.5, -worldSize * 0.85 + 0.3]}
        rotation={[0, 0, 0]}
        width={6}
        url=""
      />

      {/* VideoPlayer（南の壁） */}
      <LiveVideoPlayer
        id="video-south"
        position={[0, 2.5, worldSize * 0.85 - 0.3]}
        rotation={[0, Math.PI, 0]}
        width={6}
        url=""
      />

      {/* VideoPlayer（東の壁） */}
      <LiveVideoPlayer
        id="video-east"
        position={[worldSize * 0.85 - 0.3, 2.5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={6}
        url=""
      />

      {/* VideoPlayer（西の壁） */}
      <LiveVideoPlayer
        id="video-west"
        position={[-worldSize * 0.85 + 0.3, 2.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={6}
        url=""
      />

      {/* 細い道（南東方向） */}
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <GroundPlane
          width={3}
          height={worldSize * 0.8}
          color="#B5651D"
          position={[worldSize * 0.95, -0.05, worldSize * 0.95]}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          noiseScale={0.8}
          noiseIntensity={0.4}
        />
      </RigidBody>

      {/* 道沿いの照明（左側） */}
      <group position={[worldSize * 0.85 - 2, 0, worldSize * 0.85 + 2]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4]} />
          <meshLambertMaterial color="#3a3a3a" />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color="#ffffcc"
            emissive="#ffeeaa"
            emissiveIntensity={1}
          />
        </mesh>
        <pointLight
          position={[0, 2.6, 0]}
          color="#ffeecc"
          intensity={15}
          distance={20}
        />
      </group>

      {/* 道沿いの照明（右側） */}
      <group position={[worldSize * 1.05 + 2, 0, worldSize * 1.05 - 2]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4]} />
          <meshLambertMaterial color="#3a3a3a" />
        </mesh>
        <mesh position={[0, 2.6, 0]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color="#ffffcc"
            emissive="#ffeeaa"
            emissiveIntensity={1}
          />
        </mesh>
        <pointLight
          position={[0, 2.6, 0]}
          color="#ffeecc"
          intensity={15}
          distance={20}
        />
      </group>

      {/* ランタン（北東）- 2本 */}
      <Lantern position={[worldSize * 0.45, 0, -worldSize * 0.75]} />
      <Lantern position={[worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* ランタン（北西）- 2本 */}
      <Lantern position={[-worldSize * 0.45, 0, -worldSize * 0.75]} />
      <Lantern position={[-worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* ランタン（南東）- 2本 */}
      <Lantern position={[worldSize * 0.45, 0, worldSize * 0.75]} />
      <Lantern position={[worldSize * 0.75, 0, worldSize * 0.45]} />

      {/* ランタン（南西）- 2本 */}
      <Lantern position={[-worldSize * 0.45, 0, worldSize * 0.75]} />
      <Lantern position={[-worldSize * 0.75, 0, worldSize * 0.45]} />
    </group>
  );
};
