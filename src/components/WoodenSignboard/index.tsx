import { ScreenShareDisplay } from '@xrift/world-components'

export interface WoodenSignboardProps {
  id: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  displayWidth?: number
}

export const WoodenSignboard: React.FC<WoodenSignboardProps> = ({
  id,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  displayWidth = 4.5,
}) => {
  return (
    <group position={position} rotation={rotation}>
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
        id={id}
        position={[0, 2, 0.26]}
        rotation={[0, 0, 0]}
        width={displayWidth}
      />
    </group>
  )
}
