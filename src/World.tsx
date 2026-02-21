import { SpawnPoint, ScreenShareDisplay } from "@xrift/world-components";
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
          position={[0, -0.1, 0]}
          noiseScale={0.3}
          noiseIntensity={0.5}
        />
      </RigidBody>

      {/* 木 */}
      <Trees
        count={160}
        innerRadius={worldSize * 1.1}
        outerRadius={worldSize * 1.9}
      />

      {/* 草 */}
      <Grass
        count={80000}
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
