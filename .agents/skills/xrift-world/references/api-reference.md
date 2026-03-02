# @xrift/world-components API Reference

## Hooks

### useXRift()

Hook for getting asset URLs. Required for loading assets within a world.

**Returns**: `{ baseUrl: string }`

```typescript
import { useXRift } from '@xrift/world-components'

const { baseUrl } = useXRift()
// baseUrl includes a trailing /
// Correct: `${baseUrl}model.glb`
// Wrong:   `${baseUrl}/model.glb`
```

### useInstanceState(key, initialValue)

Hook for synchronizing state across all users. Shared among all players within a world instance.

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Unique key for the state |
| `initialValue` | `T` | Initial value |

**Returns**: `[T, (value: T | ((prev: T) => T)) => void]`

```typescript
import { useInstanceState } from '@xrift/world-components'

const [count, setCount] = useInstanceState('click-count', 0)
setCount(prev => prev + 1)
```

### useUsers()

Hook for getting user information and positions.

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `localUser` | `User` | Current user's information |
| `remoteUsers` | `User[]` | List of other users |
| `getMovement(socketId)` | `(id: string) => PlayerMovement \| null` | Get movement data for a specific user |
| `getLocalMovement()` | `() => PlayerMovement` | Get current user's movement data |

```typescript
import { useUsers } from '@xrift/world-components'

const { localUser, remoteUsers, getMovement, getLocalMovement } = useUsers()
```

### useSpawnPoint()

Hook for getting the spawn point.

**Returns**: `{ position: [number, number, number], yaw: number }`

```typescript
import { useSpawnPoint } from '@xrift/world-components'

const { position, yaw } = useSpawnPoint()
```

### useScreenShareContext()

Hook for screen sharing state.

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `videoElement` | `HTMLVideoElement \| null` | Screen share video element |
| `isSharing` | `boolean` | Whether currently sharing |
| `startScreenShare` | `() => void` | Start screen sharing |
| `stopScreenShare` | `() => void` | Stop screen sharing |

```typescript
import { useScreenShareContext } from '@xrift/world-components'

const { videoElement, isSharing, startScreenShare, stopScreenShare } = useScreenShareContext()
```

### useConfirm()

Hook for showing a confirmation modal to the user. Useful for confirming important actions like world navigation. Also serves as a workaround for iOS Safari's popup blocker — by prompting user interaction through the confirmation dialog, it creates a user-gesture event chain that allows `window.open` and external navigation to proceed without being blocked.

**Returns**: `{ requestConfirm: (options: ConfirmOptions) => Promise<boolean> }`

`ConfirmOptions`:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | No | Dialog title |
| `message` | `string` | Yes | Message displayed to the user |
| `confirmLabel` | `string` | No | Label for the confirm button |
| `cancelLabel` | `string` | No | Label for the cancel button |

The returned `Promise<boolean>` resolves to `true` if the user confirms, `false` if cancelled.

```typescript
import { useConfirm } from '@xrift/world-components'

const { requestConfirm } = useConfirm()
const ok = await requestConfirm({ message: 'ワールドを移動しますか？' })
if (ok) {
  // proceed with action
}
```

### useTeleport()

Hook for instant player teleportation.

**Returns**: `{ teleport: (dest: TeleportDestination) => void }`

`TeleportDestination`: `{ position: [number, number, number], yaw?: number }`
- `yaw` is in degrees (0-360). If omitted, the player's current facing direction is preserved.

```typescript
import { useTeleport } from '@xrift/world-components'

const { teleport } = useTeleport()
teleport({ position: [50, 0, 30], yaw: 180 })
```

[useTeleport Documentation](https://docs.xrift.net/world-components/components/#useteleport)

### useInstance(instanceId)

Hook for fetching instance information and navigating to an instance with a confirmation dialog. Internally uses `InstanceContext` (injected by the platform) and `useConfirm` for the confirmation modal.

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `instanceId` | `string` | Target instance ID |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `info` | `InstanceInfo \| null` | Instance information (fetched on mount) |
| `navigateWithConfirm` | `() => Promise<void>` | Navigate to the instance with a confirmation modal |

`navigateWithConfirm` fetches the latest instance info, shows a confirmation dialog with the world name, instance name, and current user count, then navigates on confirmation.

```typescript
import { useInstance } from '@xrift/world-components'

const { info, navigateWithConfirm } = useInstance('target-instance-id')
// info?.world.name — world name
// info?.currentUsers — current user count
// navigateWithConfirm() — navigate with confirmation
```

### useWorld(worldId)

Hook for fetching world information. Internally uses `WorldContext` (injected by the platform).

**Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `worldId` | `string` | Target world ID |

**Returns**:
| Property | Type | Description |
|----------|------|-------------|
| `info` | `WorldInfo \| null` | World information (fetched on mount) |

```typescript
import { useWorld } from '@xrift/world-components'

const { info } = useWorld('target-world-id')
// info?.name — world name
// info?.thumbnailUrl — thumbnail URL
```

---

## Components

### Interactable

A clickable interactive object. Automatically sets `LAYERS.INTERACTABLE` on child objects.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `onInteract` | `() => void` | Yes | Callback when clicked |
| `interactionText` | `string` | No | Text displayed on hover |
| `enabled` | `boolean` | No | Enable/disable interaction |

```typescript
import { Interactable } from '@xrift/world-components'

<Interactable
  id="my-button"
  onInteract={() => console.log('clicked')}
  interactionText="Click me"
>
  <mesh>
    <boxGeometry args={[1, 1, 0.2]} />
    <meshStandardMaterial color="blue" />
  </mesh>
</Interactable>
```

### SpawnPoint

Player spawn location.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `position` | `[number, number, number]` | No | Spawn position |
| `yaw` | `number` | No | Facing direction (0-360 degrees) |

```typescript
import { SpawnPoint } from '@xrift/world-components'

<SpawnPoint position={[0, 0, 0]} yaw={180} />
```

### Mirror

Reflective surface component.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `position` | `[number, number, number]` | No | Position |
| `rotation` | `[number, number, number]` | No | Rotation |
| `size` | `[number, number]` | No | Size |
| `color` | `string` | No | Color |
| `textureResolution` | `number` | No | Texture resolution |

```typescript
import { Mirror } from '@xrift/world-components'

<Mirror position={[0, 1.5, -3]} size={[2, 3]} />
```

### VideoPlayer

Video player component with UI controls (play/pause, progress bar, volume, URL input). VR-compatible.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `url` | `string` | Yes | Video URL |
| `position` | `[number, number, number]` | No | Position |
| `rotation` | `[number, number, number]` | No | Rotation |
| `width` | `number` | No | Width |
| `playing` | `boolean` | No | Playing state |
| `volume` | `number` | No | Volume |
| `sync` | `boolean` | No | Sync playback across users |

```typescript
import { VideoPlayer } from '@xrift/world-components'

<VideoPlayer
  id="main-video"
  url="https://example.com/video.mp4"
  position={[0, 2, -5]}
  width={4}
/>
```

### Portal

A portal component for navigating to another instance. Displays the target instance's world thumbnail, name, and a vortex shader effect. When a player steps onto the pedestal, a confirmation modal is shown before navigating.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `instanceId` | `string` | Yes | Target instance ID |
| `position` | `[number, number, number]` | No | Position (default: `[0, 0, 0]`) |
| `rotation` | `[number, number, number]` | No | Rotation (default: `[0, 0, 0]`) |

```typescript
import { Portal } from '@xrift/world-components'

<Portal
  instanceId="target-instance-id"
  position={[5, 0, 0]}
/>
```

### ScreenShareDisplay

Screen share display component.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier |
| `position` | `[number, number, number]` | No | Position |
| `rotation` | `[number, number, number]` | No | Rotation |
| `width` | `number` | No | Width |

```typescript
import { ScreenShareDisplay } from '@xrift/world-components'

<ScreenShareDisplay id="screen-share" position={[0, 2, -3]} width={4} />
```

---

## Constants

### LAYERS (Three.js Layer Constants)

Three.js cameras and objects have 32 layers (0-31). A camera only renders objects belonging to its enabled layers.

| Constant | Value | Purpose |
|----------|-------|---------|
| `LAYERS.DEFAULT` | 0 | Default layer (all objects belong to this initially) |
| `LAYERS.FIRST_PERSON_ONLY` | 9 | First-person view only (for VRM headless copy) |
| `LAYERS.THIRD_PERSON_ONLY` | 10 | Third-person view only (for other players and mirrors) |
| `LAYERS.INTERACTABLE` | 11 | Interactable objects (for Raycast detection) |

```typescript
import { LAYERS } from '@xrift/world-components'
```

**How It Works**:
- The `Interactable` component automatically sets `LAYERS.INTERACTABLE` on child objects
- In production, the frontend performs Raycasts on the `LAYERS.INTERACTABLE` layer to detect interactions
- In the dev environment (`dev.tsx`), you need to set the Raycaster layer to `LAYERS.INTERACTABLE` to test interactions

```typescript
// Detect only interactable objects with Raycaster
const raycaster = new Raycaster()
raycaster.layers.set(LAYERS.INTERACTABLE) // Only hits objects on layer 11
```
