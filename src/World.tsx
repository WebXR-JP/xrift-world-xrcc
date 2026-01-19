import { SpawnPoint } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'
import { BackgroundAudio } from './components/BackgroundAudio'
import { Bonfire } from './components/Bonfire'
import { Grass } from './components/Grass'
import { Ground } from './components/Ground'
import { GroundPlane } from './components/GroundPlane'
import { Lantern } from './components/Lantern'
import { Skybox } from './components/Skybox'
import { StreetLight } from './components/StreetLight'
import { Trees } from './components/Trees'
import { VideoWall } from './components/VideoWall'
import { WoodenSignboard } from './components/WoodenSignboard'
import { COLORS, WORLD_CONFIG } from './constants'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
}

export const World: React.FC<WorldProps> = ({
  position = [0, 0, 0],
  scale = 1,
}) => {
  const worldSize = WORLD_CONFIG.size * scale

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

      {/* 木 */}
      <Trees
        count={160}
        innerRadius={worldSize * 1.1}
        outerRadius={worldSize * 1.9}
      />

      {/* 草 */}
      <Grass
        count={500}
        innerRadius={worldSize * 1.05}
        outerRadius={worldSize * 1.95}
      />

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
      <Bonfire />

      {/* 木の看板（画面共有用） */}
      <WoodenSignboard
        id="screen-share-board"
        position={[-5, 0, -5]}
        rotation={[0, Math.PI / 4, 0]}
      />

      {/* 壁 + VideoPlayer */}
      <VideoWall id="video-north" position={[0, 0, -worldSize * 0.85]} color={COLORS.wall} />
      <VideoWall id="video-south" position={[0, 0, worldSize * 0.85]} rotation={[0, Math.PI, 0]} color={COLORS.wall} />
      <VideoWall id="video-east" position={[worldSize * 0.85, 0, 0]} rotation={[0, -Math.PI / 2, 0]} color={COLORS.wall} />
      <VideoWall id="video-west" position={[-worldSize * 0.85, 0, 0]} rotation={[0, Math.PI / 2, 0]} color={COLORS.wall} />

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

      {/* 道沿いの照明 */}
      <StreetLight position={[worldSize * 0.85 - 2, 0, worldSize * 0.85 + 2]} />
      <StreetLight position={[worldSize * 1.05 + 2, 0, worldSize * 1.05 - 2]} />

      {/* ランタン（北東） */}
      <Lantern position={[worldSize * 0.45, 0, -worldSize * 0.75]} />
      <Lantern position={[worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* ランタン（北西） */}
      <Lantern position={[-worldSize * 0.45, 0, -worldSize * 0.75]} />
      <Lantern position={[-worldSize * 0.75, 0, -worldSize * 0.45]} />

      {/* ランタン（南東） */}
      <Lantern position={[worldSize * 0.45, 0, worldSize * 0.75]} />
      <Lantern position={[worldSize * 0.75, 0, worldSize * 0.45]} />

      {/* ランタン（南西） */}
      <Lantern position={[-worldSize * 0.45, 0, worldSize * 0.75]} />
      <Lantern position={[-worldSize * 0.75, 0, worldSize * 0.45]} />
    </group>
  )
}
