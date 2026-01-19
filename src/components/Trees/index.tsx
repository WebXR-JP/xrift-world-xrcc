import { useMemo } from 'react'
import { Instances, Instance } from '@react-three/drei'

export interface TreesProps {
  count?: number
  innerRadius: number
  outerRadius: number
  excludeAngleStart?: number
  excludeAngleEnd?: number
}

interface TreePosition {
  x: number
  z: number
  scale: number
  rotation: number
}

const generateTreePositions = (
  count: number,
  innerRadius: number,
  outerRadius: number,
  excludeAngleStart?: number,
  excludeAngleEnd?: number,
): TreePosition[] => {
  const positions: TreePosition[] = []
  const seed = 12345

  const seededRandom = (i: number) => {
    const x = Math.sin(seed + i * 9999) * 10000
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
      const treeAngle = Math.atan2(z, x)
      if (
        treeAngle > excludeAngleStart &&
        treeAngle < excludeAngleEnd &&
        radius > innerRadius * 0.9
      ) {
        continue
      }
    }

    positions.push({
      x,
      z,
      scale: 0.7 + seededRandom(i * 3) * 0.6,
      rotation: seededRandom(i * 4) * Math.PI * 2,
    })
  }
  return positions
}

export const Trees: React.FC<TreesProps> = ({
  count = 160,
  innerRadius,
  outerRadius,
  excludeAngleStart = Math.PI / 8,
  excludeAngleEnd = (Math.PI * 3) / 8,
}) => {
  const treePositions = useMemo(
    () =>
      generateTreePositions(
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
      {/* 幹 */}
      <Instances limit={count + 50}>
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
      <Instances limit={count + 50}>
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
    </>
  )
}
