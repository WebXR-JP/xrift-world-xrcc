import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'

export interface GrassProps {
  count?: number
  innerRadius: number
  outerRadius: number
  excludeAngleStart?: number
  excludeAngleEnd?: number
}

interface GrassPosition {
  x: number
  z: number
  scale: number
  rotation: number
}

const generateGrassPositions = (
  count: number,
  innerRadius: number,
  outerRadius: number,
  excludeAngleStart?: number,
  excludeAngleEnd?: number,
): GrassPosition[] => {
  const positions: GrassPosition[] = []
  const seed = 54321 // 木とは異なるシード

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 7777) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < count; i++) {
    const angle = seededRandom(i * 2) * Math.PI * 2
    const radius =
      innerRadius + seededRandom(i * 2 + 1) * (outerRadius - innerRadius)
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    // 除外角度範囲をスキップ
    if (excludeAngleStart !== undefined && excludeAngleEnd !== undefined) {
      const grassAngle = Math.atan2(z, x)
      if (
        grassAngle > excludeAngleStart &&
        grassAngle < excludeAngleEnd &&
        radius > innerRadius * 0.85
      ) {
        continue
      }
    }

    positions.push({
      x,
      z,
      scale: 0.3 + seededRandom(i * 3) * 0.5,
      rotation: seededRandom(i * 4) * Math.PI * 2,
    })
  }
  return positions
}

export const Grass: React.FC<GrassProps> = ({
  count = 500,
  innerRadius,
  outerRadius,
  excludeAngleStart = Math.PI / 8,
  excludeAngleEnd = (Math.PI * 3) / 8,
}) => {
  const grassPositions = useMemo(
    () =>
      generateGrassPositions(
        count,
        innerRadius,
        outerRadius,
        excludeAngleStart,
        excludeAngleEnd,
      ),
    [count, innerRadius, outerRadius, excludeAngleStart, excludeAngleEnd],
  )

  return (
    <>
      {/* 草（明るい緑） */}
      <Instances limit={count + 100}>
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
      <Instances limit={count + 100}>
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
    </>
  )
}
