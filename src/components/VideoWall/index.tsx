import { RigidBody } from '@react-three/rapier'
import { LiveVideoPlayer } from '@xrift/world-components'

export interface VideoWallProps {
  id: string
  direction: 'north' | 'south' | 'east' | 'west'
  distance: number
  wallWidth: number
  wallHeight: number
  wallThickness: number
  color?: string
  videoWidth?: number
  videoUrl?: string
  videoOffset?: number
  videoHeight?: number
}

const getWallConfig = (
  direction: 'north' | 'south' | 'east' | 'west',
  distance: number,
  wallWidth: number,
  wallHeight: number,
  wallThickness: number,
  videoOffset: number,
  videoHeight: number,
) => {
  switch (direction) {
    case 'north':
      return {
        wallPosition: [0, wallHeight / 2, -distance] as [number, number, number],
        wallSize: [wallWidth, wallHeight, wallThickness] as [
          number,
          number,
          number,
        ],
        videoPosition: [0, videoHeight, -distance + videoOffset] as [
          number,
          number,
          number,
        ],
        videoRotation: [0, 0, 0] as [number, number, number],
      }
    case 'south':
      return {
        wallPosition: [0, wallHeight / 2, distance] as [number, number, number],
        wallSize: [wallWidth, wallHeight, wallThickness] as [
          number,
          number,
          number,
        ],
        videoPosition: [0, videoHeight, distance - videoOffset] as [
          number,
          number,
          number,
        ],
        videoRotation: [0, Math.PI, 0] as [number, number, number],
      }
    case 'east':
      return {
        wallPosition: [distance, wallHeight / 2, 0] as [number, number, number],
        wallSize: [wallThickness, wallHeight, wallWidth] as [
          number,
          number,
          number,
        ],
        videoPosition: [distance - videoOffset, videoHeight, 0] as [
          number,
          number,
          number,
        ],
        videoRotation: [0, -Math.PI / 2, 0] as [number, number, number],
      }
    case 'west':
      return {
        wallPosition: [-distance, wallHeight / 2, 0] as [
          number,
          number,
          number,
        ],
        wallSize: [wallThickness, wallHeight, wallWidth] as [
          number,
          number,
          number,
        ],
        videoPosition: [-distance + videoOffset, videoHeight, 0] as [
          number,
          number,
          number,
        ],
        videoRotation: [0, Math.PI / 2, 0] as [number, number, number],
      }
  }
}

export const VideoWall: React.FC<VideoWallProps> = ({
  id,
  direction,
  distance,
  wallWidth,
  wallHeight,
  wallThickness,
  color = '#8B7355',
  videoWidth = 6,
  videoUrl = '',
  videoOffset = 0.3,
  videoHeight = 2.5,
}) => {
  const config = getWallConfig(
    direction,
    distance,
    wallWidth,
    wallHeight,
    wallThickness,
    videoOffset,
    videoHeight,
  )

  return (
    <>
      <RigidBody type="fixed" colliders="cuboid" restitution={0} friction={0}>
        <mesh position={config.wallPosition} castShadow>
          <boxGeometry args={config.wallSize} />
          <meshLambertMaterial color={color} />
        </mesh>
      </RigidBody>
      <LiveVideoPlayer
        id={id}
        position={config.videoPosition}
        rotation={config.videoRotation}
        width={videoWidth}
        url={videoUrl}
      />
    </>
  )
}
