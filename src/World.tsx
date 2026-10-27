import {
  SpawnPoint,
  ScreenShareDisplay,
  Portal,
} from "@xrift/world-components";
import { RigidBody } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { Fog } from "three";
import { BackgroundAudio } from "./components/BackgroundAudio";
import { Bonfire } from "./components/Bonfire";
import { EntranceSignboard } from "./components/EntranceSignboard";
import { Grass } from "./components/Grass";
import { Ground } from "./components/Ground";
import { Skybox } from "./components/Skybox";
import { StreetLight } from "./components/StreetLight";
import { Trees } from "./components/Trees";
import { VideoWall } from "./components/VideoWall";
import { WoodenSignboard } from "./components/WoodenSignboard";
import { COLORS, WORLD_CONFIG } from "./constants";

// 同じ角に並ぶポータル同士の間隔
const PORTAL_SPACING = 2.5;

// x, z は角の方向（±1）、rotationY はワールド中心を向く回転
const PORTAL_CORNERS = [
  {
    // 北東
    x: 1,
    z: -1,
    rotationY: -Math.PI / 4,
    instanceIds: [
      "fe9604ff-b61b-4dc1-8098-d0d2d4fa86d1",
      "33aa9c29-d290-42a2-a82c-0c3b5e2e96df",
      "8d90047d-b2d8-47fe-bc96-4b61ffffda31",
    ],
  },
  {
    // 南西
    x: -1,
    z: 1,
    rotationY: (Math.PI * 3) / 4,
    instanceIds: [
      "7ee2dd84-3c4e-47f0-8d5d-dfeb711eafb9",
      "0772dea4-b017-4f1c-8afe-9bd0c36c037d",
      "e6b5fdb2-e9e7-4081-88a1-407a5ec28a34",
    ],
  },
] as const;

export interface WorldProps {
  position?: [number, number, number];
  scale?: number;
}

export const World: React.FC<WorldProps> = ({
  position = [0, 0, 0],
  scale = 1,
}) => {
  const worldSize = WORLD_CONFIG.size * scale;

  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.fog = new Fog("#636B81", 20, 80);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return (
    <group position={position} scale={scale}>
      {/* Skybox - 360度パノラマ背景 */}
      <Skybox radius={500} />

      {/* 環境光 */}
      <ambientLight intensity={0.4} color="#b6e4ff" />

      {/* BGM - 虫の鳴き声 */}
      <BackgroundAudio src="insects_sing_in_fall.mp3" volume={0.01} loop />

      {/* プレイヤーのスポーン地点（小道の先） */}
      <SpawnPoint position={[worldSize * 1.2, 0, worldSize * 1.2]} yaw={45} />

      {/* 地面（茶色・全面） */}
      <RigidBody type="fixed" colliders="trimesh" restitution={0} friction={0}>
        <Ground
          radius={worldSize * 2}
          color="#B5651D"
          outerColor="#4a8f3c"
          colorRadius={worldSize * 1.05}
          position={[0, 0, 0]}
          noiseScale={0.3}
          noiseIntensity={0.5}
        />
      </RigidBody>

      {/* 木 */}
      <Trees
        count={128}
        innerRadius={worldSize * 1.1}
        outerRadius={worldSize * 1.9}
      />

      {/* 草 */}
      <Grass
        count={10000}
        innerRadius={worldSize * 1.05}
        outerRadius={worldSize * 1.95}
      />

      {/* たき火（中央） */}
      <Bonfire />

      {/* 木の看板（画面共有用） */}
      <WoodenSignboard position={[-5, 0, -5]} rotation={[0, Math.PI / 4, 0]}>
        <ScreenShareDisplay id="screen-share-board" width={4.5} />
      </WoodenSignboard>

      {/* 壁 + VideoPlayer */}
      <VideoWall
        id="video-north"
        position={[0, 0, -worldSize * 0.85]}
        color={COLORS.wall}
      />
      <VideoWall
        id="video-south"
        position={[0, 0, worldSize * 0.85]}
        rotation={[0, Math.PI, 0]}
        color={COLORS.wall}
      />
      <VideoWall
        id="video-east"
        position={[worldSize * 0.85, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        color={COLORS.wall}
      />
      <VideoWall
        id="video-west"
        position={[-worldSize * 0.85, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        color={COLORS.wall}
      />

      {/* ポータル（北東・南西の照明の間に3基ずつ） */}
      {PORTAL_CORNERS.map(({ instanceIds, x, z, rotationY }) =>
        instanceIds.map((instanceId, i) => {
          // 中心方向と直交する向きに、真ん中を基準に左右へずらす
          const offset =
            (i - (instanceIds.length - 1) / 2) * PORTAL_SPACING * Math.SQRT1_2;
          return (
            <Portal
              key={instanceId}
              instanceId={instanceId}
              position={[
                x * worldSize * 0.6 - z * offset,
                0,
                z * worldSize * 0.6 + x * offset,
              ]}
              rotation={[0, rotationY, 0]}
            />
          );
        }),
      )}

      {/* 入口の看板（ロゴ・TagBoard・ミラー） */}
      <EntranceSignboard
        position={[worldSize * 1.05 - 2, 0, worldSize * 1.05 + 2]}
        rotation={[0, Math.PI * 0.75, 0]}
      />

      {/* 道沿いの照明 */}
      <StreetLight position={[worldSize * 0.85 - 2, 0, worldSize * 0.85 + 2]} />
      <StreetLight position={[worldSize * 1.05 + 2, 0, worldSize * 1.05 - 2]} />

      {/* 照明（北東） */}
      <StreetLight position={[worldSize * 0.45, 0, -worldSize * 0.75]} />
      <StreetLight position={[worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* 照明（北西） */}
      <StreetLight position={[-worldSize * 0.45, 0, -worldSize * 0.75]} />
      <StreetLight position={[-worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* 照明（南東） */}
      <StreetLight position={[worldSize * 0.45, 0, worldSize * 0.75]} />
      <StreetLight position={[worldSize * 0.75, 0, worldSize * 0.45]} />

      {/* 照明（南西） */}
      <StreetLight position={[-worldSize * 0.45, 0, worldSize * 0.75]} />
      <StreetLight position={[-worldSize * 0.75, 0, worldSize * 0.45]} />

    </group>
  );
};
