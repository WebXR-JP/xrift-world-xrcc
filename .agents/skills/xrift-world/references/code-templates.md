# Code Templates

Common implementation patterns for XRift world development.

## Loading a GLB Model

```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export const MyModel = () => {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(`${baseUrl}model.glb`)

  return (
    <RigidBody type="fixed">
      <primitive object={scene} castShadow receiveShadow />
    </RigidBody>
  )
}
```

## Loading a Single Texture

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const TexturedMesh = () => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}albedo.png`)

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

## Multiple Textures (PBR)

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const PBRMaterial = () => {
  const { baseUrl } = useXRift()
  const [albedo, normal, roughness] = useTexture([
    `${baseUrl}albedo.png`,
    `${baseUrl}normal.png`,
    `${baseUrl}roughness.png`,
  ])

  return (
    <meshStandardMaterial
      map={albedo}
      normalMap={normal}
      roughnessMap={roughness}
    />
  )
}
```

## Skybox (360-degree Panorama Background)

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'
import { BackSide } from 'three'

export const Skybox = ({ radius = 500 }) => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}skybox.jpg`)

  return (
    <mesh>
      <sphereGeometry args={[radius, 60, 40]} />
      <meshBasicMaterial map={texture} side={BackSide} />
    </mesh>
  )
}
```

## Interaction + State Synchronization

```typescript
import { Interactable, useInstanceState } from '@xrift/world-components'

export const InteractiveButton = ({ id }: { id: string }) => {
  // useInstanceState: State synchronized across all users
  const [clickCount, setClickCount] = useInstanceState(`${id}-count`, 0)

  return (
    <Interactable
      id={id}
      onInteract={() => setClickCount((prev) => prev + 1)}
      interactionText={`Click count: ${clickCount}`}
    >
      <mesh>
        <boxGeometry args={[1, 1, 0.2]} />
        <meshStandardMaterial color={clickCount > 0 ? 'green' : 'gray'} />
      </mesh>
    </Interactable>
  )
}
```

## Animation (useFrame)

```typescript
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

export const RotatingCube = ({ speed = 1 }) => {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}
```

## Teleport (Interactable Method)

Click-to-teleport pattern.

```typescript
import { useTeleport, Interactable } from '@xrift/world-components'

export const TeleportButton = () => {
  const { teleport } = useTeleport()
  return (
    <Interactable
      id="tp-button"
      onInteract={() => teleport({ position: [50, 0, 30], yaw: 180 })}
      interactionText="Teleport"
    >
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="purple" />
      </mesh>
    </Interactable>
  )
}
```

## Teleport (Sensor Method)

Warp zone pattern that teleports on contact.

```typescript
import { useCallback } from 'react'
import { useTeleport } from '@xrift/world-components'
import { RigidBody } from '@react-three/rapier'

export const TeleportZone = () => {
  const { teleport } = useTeleport()
  const handleEnter = useCallback(() => {
    teleport({ position: [0, 0.5, 50], yaw: 0 })
  }, [teleport])

  return (
    <RigidBody type="fixed" sensor onIntersectionEnter={handleEnter}>
      <mesh>
        <cylinderGeometry args={[1.2, 1.2, 1, 32]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </RigidBody>
  )
}
```

**Note**: When creating warp zones with the sensor method, make sure the teleport destination does not overlap with another portal (this would cause an infinite teleport loop on landing).

## Confirm Before World Navigation

Use `useConfirm` to ask the user for confirmation before navigating to another world. This also avoids iOS Safari's popup blocker by ensuring navigation is triggered from a user gesture.

```typescript
import { useConfirm, Interactable } from '@xrift/world-components'

export const WorldPortal = ({ worldId }: { worldId: string }) => {
  const { requestConfirm } = useConfirm()

  const handleEnter = async () => {
    const ok = await requestConfirm({ message: 'ワールドを移動しますか？' })
    if (ok) {
      window.location.href = `/worlds/${worldId}`
    }
  }

  return (
    <Interactable
      id={`portal-${worldId}`}
      onInteract={handleEnter}
      interactionText="Enter World"
    >
      <mesh>
        <boxGeometry args={[2, 3, 0.2]} />
        <meshStandardMaterial color="cyan" />
      </mesh>
    </Interactable>
  )
}
```

## Portal to Another Instance

Place a portal that lets players navigate to another instance with a confirmation dialog.

```typescript
import { Portal } from '@xrift/world-components'

export const MyWorld = () => {
  return (
    <>
      {/* Portal to a specific instance */}
      <Portal
        instanceId="target-instance-id"
        position={[5, 0, 0]}
      />

      {/* Multiple portals */}
      <Portal
        instanceId="another-instance-id"
        position={[-5, 0, 0]}
        rotation={[0, Math.PI, 0]}
      />
    </>
  )
}
```

## Instance / World Info Display

Use `useInstance` or `useWorld` to fetch and display information about instances or worlds.

```typescript
import { Text } from '@react-three/drei'
import { useInstance, useWorld } from '@xrift/world-components'

export const InstanceInfoBoard = ({ instanceId }: { instanceId: string }) => {
  const { info } = useInstance(instanceId)

  if (!info) return null

  return (
    <group>
      <Text position={[0, 2, 0]} fontSize={0.2} color="white">
        {info.world.name}
      </Text>
      <Text position={[0, 1.7, 0]} fontSize={0.12} color="#cccccc">
        {`${info.currentUsers}/${info.maxCapacity} players`}
      </Text>
    </group>
  )
}

export const WorldInfoBoard = ({ worldId }: { worldId: string }) => {
  const { info } = useWorld(worldId)

  if (!info) return null

  return (
    <Text position={[0, 2, 0]} fontSize={0.2} color="white">
      {info.name}
    </Text>
  )
}
```

## User Position Tracking

```typescript
import { useFrame } from '@react-three/fiber'
import { useUsers } from '@xrift/world-components'

export const UserTracker = () => {
  const { remoteUsers, getMovement, getLocalMovement } = useUsers()

  useFrame(() => {
    // Local player position
    const myMovement = getLocalMovement()
    console.log('My position:', myMovement.position)

    // Remote player positions
    remoteUsers.forEach((user) => {
      const movement = getMovement(user.socketId)
      if (movement) {
        console.log(`${user.displayName}:`, movement.position)
      }
    })
  })

  return null
}
```
