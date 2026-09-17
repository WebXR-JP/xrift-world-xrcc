# XRift Creative Commons

つくる・配信する・眺めるが、自然に混ざり合う創作の広場。

[XRift](https://xrift.net) プラットフォーム上で動作するWebXRワールドです。

**[ワールドに入る](https://app.xrift.net/world/cdd3397c-7749-45a1-bdb4-c958cc9f1237)**

## ワールド概要

森に囲まれた円形の広場を中心とした、夜の屋外空間です。

- 中央のたき火を囲むキャンプファイヤー的な空間
- 4面のビデオウォールで映像を共有
- 画面共有用の木製看板
- 入口にはTagBoardとミラーを設置
- 虫の声が聞こえるBGM、街灯による雰囲気のあるライティング
- フォグによる奥行き表現

## 開発

```bash
npm install
npm run dev        # 開発サーバー起動 (http://localhost:5173)
npm run build      # 本番ビルド
npm run typecheck  # 型チェック
```

## デプロイ

```bash
xrift login
xrift upload world
```

## 依存バージョンの扱い（重要）

このワールドは `three` や `@xrift/world-components` を**自分で持たず、XRift 本体から借りて動く**（Module Federation の shared）。
借りるための「注文書」が `vite.config.ts` の `requiredVersion`、本体側が出している「札」が
[xrift-frontend の `DEV_SHARED_DEPENDENCIES`](https://github.com/WebXR-JP/xrift-frontend/blob/main/src/screens/InstanceScreen/components/InstanceWorld/hooks/utils.ts) で、
**この2つが噛み合わないとワールドが起動しない。**

### package.json と vite.config.ts の番号は別物

| | 役割 | 上げてよいか |
|---|---|---|
| `package.json` の依存 | 開発時の型チェックとビルドに使う | ✅ 上げてよい |
| `vite.config.ts` の `requiredVersion` | 本体から借りるときの照合条件 | ❌ **勝手に上げない** |

ズレているのが正常。実行時に渡されるのは常に本体が持っている実物なので、
`package.json` を上げれば新しい API が使えるようになり、`requiredVersion` を上げる必要はない。

### なぜ上げてはいけないか

`requiredVersion` を上げると本体の札と一致しなくなり、借りるのに失敗する。
このとき Module Federation はワールド同梱の予備 `__federation_shared_*.js` を読みに行くが、
**その予備は `xrift.json` の `ignore` でアップロードしていない**ため 404 になり、ワールドごと落ちる。

```
[useWorldComponent] Failed to load world: TypeError: Failed to fetch
dynamically imported module: .../__federation_shared_three-XXXX.js
```

予備をアップロードしない理由は、three のようなライブラリが二重に読み込まれると
R3F が別インスタンスを掴んで壊れるため。**借りるのに成功することが前提の設計**になっている。

なお 0.x の `^` は極端に狭い（`^0.176.0` は `>=0.176.0 <0.177.0`）ので、
three のようなパッケージは少し上げるだけで即座に不一致になる。

### xrift.json の ignore に `**/` を付けない

アップロード対象の除外は minimatch ではなく、@xrift/sdk の素朴な正規表現で判定される。

```js
const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
return regex.test(filePath) || regex.test(fileName)
```

`**/foo-*.js` は `^.*.*/foo-.*\.js$` になり **`/` を1つ以上要求する**ため、
トップレベルのファイルには永久にマッチしない（minimatch と違い「0階層」を許さない）。

```json
"ignore": [
  "rapier-*.js",      // ✅ 効く
  "**/rapier-*.js"    // ❌ 静かに無視される
]
```

`__federation_shared_*.js` だけは SDK 側のデフォルトに入っているため、
ignore に書かなくても常に除外される。

### 借りられるか確認する

本体の札は上記 `utils.ts` にベタ書きされているので、ビルド後にそれと突き合わせれば事前に確認できる。

```bash
npm run build && cat dist/__federation_fn_import-*.js | grep -o "requiredVersion:'[^']*'"
```

## 技術スタック

- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org/)
- [Rapier](https://rapier.rs/) 物理エンジン
- [@xrift/world-components](https://github.com/WebXR-JP/xrift-world-components)
- TypeScript / Vite / Module Federation

## ライセンス

MIT
