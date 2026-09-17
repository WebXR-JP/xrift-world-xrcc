# XRift World Template - AI ガイド

このドキュメントは、AI（Claude、ChatGPT、Cursor等）がXRiftワールドを作成・修正する際のガイドです。

---

## 最重要ルール（必ず守ること）

1. **アセット読み込みは必ず `useXRift()` の `baseUrl` を使用**
2. **アセットファイルは `public/` ディレクトリに配置**
3. **`baseUrl` は末尾に `/` を含むため、`${baseUrl}path` で結合**（`${baseUrl}/path` は NG）
4. **`vite.config.ts` の `requiredVersion` は絶対に書き換えない**（後述「共有依存のバージョン」）

```typescript
// ✅ 正しい
const { baseUrl } = useXRift()
const model = useGLTF(`${baseUrl}models/robot.glb`)

// ❌ 間違い
const model = useGLTF('/models/robot.glb')           // 絶対パス NG
const model = useGLTF(`${baseUrl}/models/robot.glb`) // 余分な / NG
```

---

## プロジェクト概要

- **用途**: XRiftプラットフォーム用WebXRワールド
- **技術**: React Three Fiber + Rapier物理エンジン + Module Federation
- **動作**: CDNにアップロード後、フロントエンドから動的ロード

---

## @xrift/world-components API

### フック

| フック | 用途 | 戻り値 |
|--------|------|--------|
| `useXRift()` | アセットURL取得 | `{ baseUrl: string }` |
| `useInstanceState(key, initial)` | 全ユーザー間で状態同期 | `[value, setValue]` |
| `useUsers()` | ユーザー情報・位置取得 | `{ localUser, remoteUsers, getMovement, getLocalMovement }` |
| `useSpawnPoint()` | スポーン地点取得 | `{ position, yaw }` |
| `useScreenShareContext()` | 画面共有状態 | `{ videoElement, isSharing, startScreenShare, stopScreenShare }` |

### コンポーネント

| コンポーネント | 用途 | 主要Props |
|---------------|------|-----------|
| `Interactable` | クリック可能オブジェクト | `id`(必須), `onInteract`(必須), `interactionText`, `enabled` |
| `SpawnPoint` | プレイヤー出現地点 | `position`, `yaw`(0-360度) |
| `Mirror` | 反射面 | `position`, `rotation`, `size`, `color`, `textureResolution` |
| `VideoPlayer` | UI付き動画再生 | `id`(必須), `url`(必須), `position`, `rotation`, `width`, `playing`, `volume`, `sync` |
| `ScreenShareDisplay` | 画面共有表示 | `id`(必須), `position`, `rotation`, `width` |

**VideoPlayer**: UIコントロール付き（再生/一時停止、進捗バー、音量調整、URL入力）、VR対応

---

## コード生成テンプレート

### GLBモデル読み込み

```typescript
import { useXRift } from '@xrift/world-components'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'

export const MyModel = () => {
  const { baseUrl } = useXRift()
  const { scene } = useGLTF(`${baseUrl}models/model.glb`)

  return (
    <RigidBody type="fixed">
      <primitive object={scene} castShadow receiveShadow />
    </RigidBody>
  )
}
```

### テクスチャ読み込み

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const TexturedMesh = () => {
  const { baseUrl } = useXRift()
  const texture = useTexture(`${baseUrl}textures/albedo.png`)

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

### 複数テクスチャ（PBR）

```typescript
import { useXRift } from '@xrift/world-components'
import { useTexture } from '@react-three/drei'

export const PBRMaterial = () => {
  const { baseUrl } = useXRift()
  const [albedo, normal, roughness] = useTexture([
    `${baseUrl}textures/albedo.png`,
    `${baseUrl}textures/normal.png`,
    `${baseUrl}textures/roughness.png`,
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

### Skybox（360度パノラマ背景）

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

### インタラクション + 状態同期

```typescript
import { Interactable, useInstanceState } from '@xrift/world-components'

export const InteractiveButton = ({ id }: { id: string }) => {
  // useInstanceState: 全ユーザー間で同期される状態
  const [clickCount, setClickCount] = useInstanceState(`${id}-count`, 0)

  return (
    <Interactable
      id={id}
      onInteract={() => setClickCount((prev) => prev + 1)}
      interactionText={`クリック回数: ${clickCount}`}
    >
      <mesh>
        <boxGeometry args={[1, 1, 0.2]} />
        <meshStandardMaterial color={clickCount > 0 ? 'green' : 'gray'} />
      </mesh>
    </Interactable>
  )
}
```

### アニメーション（useFrame）

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

### ユーザー位置追跡

```typescript
import { useFrame } from '@react-three/fiber'
import { useUsers } from '@xrift/world-components'

export const UserTracker = () => {
  const { remoteUsers, getMovement, getLocalMovement } = useUsers()

  useFrame(() => {
    // 自分の位置
    const myMovement = getLocalMovement()
    console.log('My position:', myMovement.position)

    // 他ユーザーの位置
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

---

## 型定義

### User

```typescript
interface User {
  id: string           // 認証ユーザーID
  socketId: string     // ソケット接続ID
  displayName: string  // 表示名
  avatarUrl: string | null
  isGuest: boolean
}
```

### PlayerMovement

```typescript
interface PlayerMovement {
  position: { x: number; y: number; z: number }
  direction: { x: number; z: number }  // 移動方向（正規化）
  horizontalSpeed: number              // XZ平面速度
  verticalSpeed: number                // Y軸速度
  rotation: { yaw: number; pitch: number }
  isGrounded: boolean
  isJumping: boolean
  isInVR?: boolean
  vrTracking?: VRTrackingData  // VRモード時のみ
}
```

### VRTrackingData

```typescript
interface VRTrackingData {
  head: { yaw: number; pitch: number }
  leftHand: { position: Position3D; rotation: Rotation3D }
  rightHand: { position: Position3D; rotation: Rotation3D }
  hipsPositionDelta: Position3D
  movementDirection: 'forward' | 'backward' | 'left' | 'right' | 'idle'
  isHandTracking?: boolean
}
```

---

## プロジェクト構造

```
xrift-world-template/
├── public/              # アセットファイル（GLB, テクスチャ, 画像）
│   ├── models/          # 3Dモデル (.glb, .gltf)
│   ├── textures/        # テクスチャ画像
│   └── *.jpg, *.png     # Skybox等
├── src/
│   ├── components/      # 3Dコンポーネント
│   ├── World.tsx        # メインワールドコンポーネント
│   ├── dev.tsx          # 開発用エントリーポイント
│   ├── index.tsx        # 本番用エクスポート
│   └── constants.ts     # 定数定義
├── .triplex/            # Triplex（3Dエディタ）設定
├── xrift.json           # XRift CLI設定
├── vite.config.ts       # ビルド設定（Module Federation）
└── package.json
```

---

## xrift.json 設定

### physics（物理演算設定）

| 項目 | 型 | デフォルト値 | 説明 |
|------|-----|-----------|------|
| `gravity` | number | 9.81 | 重力の強さ（正の値、地球=9.81、月=1.62、木星=24.79） |
| `allowInfiniteJump` | boolean | true | 無限ジャンプを許可するか |

```json
{
  "physics": {
    "gravity": 9.81,
    "allowInfiniteJump": true
  }
}
```

**設定例**:
- **アスレチックワールド**: `"allowInfiniteJump": false` で落下のリスクを追加
- **低重力ワールド**: `"gravity": 1.62`（月の重力）でふわふわした動き
- **高重力ワールド**: `"gravity": 24.79`（木星の重力）で重厚な動き

---

## コマンドリファレンス

```bash
# 開発
npm run dev        # 開発サーバー起動 (http://localhost:5173)
npm run build      # 本番ビルド
npm run typecheck  # 型チェック

# XRift CLI
xrift login        # 認証
xrift create       # 新規プロジェクト作成
xrift upload world # ワールドをアップロード
xrift whoami       # ログインユーザー確認
xrift logout       # ログアウト
```

---

## 開発環境セットアップ

### dev.tsx の構成

```typescript
import { XRiftProvider } from '@xrift/world-components'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { World } from './World'

createRoot(rootElement).render(
  <XRiftProvider baseUrl="/">
    <Canvas shadows camera={{ position: [0, 5, 10], fov: 75 }}>
      <Physics>
        <World />
      </Physics>
    </Canvas>
  </XRiftProvider>
)
```

**注意**: 本番環境では `XRiftProvider` は不要（フロントエンド側が自動でラップ）

---

## 依存パッケージ

### 必須（peerDependencies）
- `react` / `react-dom` ^19.0.0
- `three` ^0.182.0
- `@react-three/fiber` ^9.3.0
- `@react-three/drei` ^10.7.3
- `@react-three/rapier` ^2.1.0

### XRift固有
- `@xrift/world-components` - XRiftのフック・コンポーネント

---

## 共有依存のバージョン（触ると壊れる）

`three` / `@react-three/*` / `@xrift/world-components` などは、ワールドが自分で持たず
**XRift 本体から借りて動く**（Module Federation の shared）。

### 絶対にやってはいけないこと

`vite.config.ts` の `requiredVersion` を、`package.json` の実バージョンに合わせて更新すること。

```typescript
// ❌ 絶対NG：package.json を上げたからといって、ここを揃えてはいけない
three: {
  singleton: true,
  requiredVersion: '^0.182.0',   // 上げた瞬間にワールドが起動しなくなる
},

// ✅ 正しい：package.json と一致していなくてよい。むしろズレているのが正常
three: {
  singleton: true,
  requiredVersion: '^0.176.0',
},
```

### 理由

`requiredVersion` は本体が出している「札」との照合にしか使われず、実行時に渡されるのは
常に本体が持っている実物。したがって揃えても得るものは何もなく、照合に失敗するだけになる。

照合に失敗するとワールド同梱の予備 `__federation_shared_*.js` を読みに行くが、
これは `xrift.json` の `ignore` によりアップロードされていないため 404 になり、ワールドごと落ちる。

```
[useWorldComponent] Failed to load world: TypeError: Failed to fetch
dynamically imported module: .../__federation_shared_three-XXXX.js
```

0.x の `^` は `^0.176.0` = `>=0.176.0 <0.177.0` と極端に狭いので、わずかに上げるだけで即不一致になる。

### 新しい API を使いたいとき

`package.json` の依存だけを上げる。`vite.config.ts` は触らない。

```bash
npm i @xrift/world-components@latest   # 型とビルドが新しくなる
npm run typecheck && npm run build     # requiredVersion は変更しない
```

本体が出している札の一覧は
[xrift-frontend の `DEV_SHARED_DEPENDENCIES`](https://github.com/WebXR-JP/xrift-frontend/blob/main/src/screens/InstanceScreen/components/InstanceWorld/hooks/utils.ts)
にある。ビルド後の `dist/__federation_fn_import-*.js` の `requiredVersion` と突き合わせれば事前に確認できる。

### xrift.json の ignore は `**/` を付けない

除外判定は minimatch ではなく @xrift/sdk の素朴な正規表現で行われ、
`**/` は「`/` が1つ以上必要」と解釈される。トップレベルのファイルを除外したいときに
`**/foo-*.js` と書くと**静かに無視される**ので、`foo-*.js` と書くこと。

### world-components が新しい依存を使い始めたとき

ビルドが `Rollup failed to resolve import "..."` で落ちたら、その依存も本体から借りる必要がある。
本体の札にあることを確認した上で、devDependencies に追加し `shared` にも宣言し、
`xrift.json` の `ignore` にフォールバックを追加する（3箇所セット）。

---

## トラブルシューティング

### "useXRift must be used within XRiftProvider"

**原因**: `XRiftProvider` でラップされていない

**解決方法**:
- `src/dev.tsx` で `XRiftProvider` を使用しているか確認
- Triplex使用時: `.triplex/provider.tsx` を確認

### アセットが読み込めない

**原因**: `baseUrl` を使用していない、またはパス結合が間違っている

**解決方法**:
```typescript
// ✅ 正しい
const { baseUrl } = useXRift()
const model = useGLTF(`${baseUrl}models/robot.glb`)

// ❌ 間違い
const model = useGLTF('/models/robot.glb')
const model = useGLTF(`${baseUrl}/models/robot.glb`)
```

### ワールドが読み込めない / `Failed to fetch dynamically imported module`

**原因**: `vite.config.ts` の `requiredVersion` が本体の札と一致せず、
存在しないフォールバック `__federation_shared_*.js` を取りに行っている

**解決方法**: `requiredVersion` を元に戻す（「共有依存のバージョン」を参照）。
`package.json` の番号に合わせて揃えてはいけない。

---

### 物理演算が効かない

**原因**: `Physics` コンポーネントでラップされていない、または `RigidBody` がない

**解決方法**:
```typescript
<Physics>
  <RigidBody type="fixed">  {/* または "dynamic" */}
    <mesh>...</mesh>
  </RigidBody>
</Physics>
```

---

## 参考リンク

- [XRift ドキュメント](https://docs.xrift.net)
- [XRift CLI (GitHub)](https://github.com/WebXR-JP/xrift-cli)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Rapier Physics](https://rapier.rs/docs/)

---

## 実装例の参照先

- **GLBモデル**: `src/components/Duck/index.tsx`
- **Skybox**: `src/components/Skybox/index.tsx`
- **アニメーション**: `src/components/RotatingObject/index.tsx`
- **インタラクション**: `src/components/InteractableButton/index.tsx`
- **ユーザー追跡**: `src/components/RemoteUserHUDs/index.tsx`
- **カスタムシェーダ**: `src/components/SpawnPoint/index.tsx`
- **メインワールド**: `src/World.tsx`
