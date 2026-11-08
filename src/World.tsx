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
// 行き先は worldId で指定する（くぐると空いている部屋に合流、無ければ作成される）
const PORTAL_CORNERS = [
  {
    // 北東
    x: 1,
    z: -1,
    rotationY: -Math.PI / 4,
    worldIds: [
      "c12b97a7-2d07-4c76-85fb-c3dfd0a0e380", // のらねこび自然科学館
      "bbfdfefe-f572-468e-8cd2-1884205d3e1c", // PONG PONG BATTLER
      "b80fca9c-2d69-4b36-8cb4-e99061175cd8", // カートクラブ
    ],
  },
  {
    // 南西
    x: -1,
    z: 1,
    rotationY: (Math.PI * 3) / 4,
    worldIds: [
      "e945aa6c-5ab1-4d7c-963c-ec6f0bac1299", // XRiftStudio Tutorial
      "41100e01-be41-4ee4-81eb-11a30c4f927c", // 3DGS Gallery Island
      "34deb9ee-732a-4af3-ad75-541413a00caf", // Space Elevator
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
      {PORTAL_CORNERS.map(({ worldIds, x, z, rotationY }) =>
        worldIds.map((worldId, i) => {
          // 中心方向と直交する向きに、真ん中を基準に左右へずらす
          const offset =
            (i - (worldIds.length - 1) / 2) * PORTAL_SPACING * Math.SQRT1_2;
          return (
            <Portal
              key={worldId}
              worldId={worldId}
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
