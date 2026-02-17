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

## 技術スタック

- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) + [Three.js](https://threejs.org/)
- [Rapier](https://rapier.rs/) 物理エンジン
- [@xrift/world-components](https://github.com/WebXR-JP/xrift-world-components)
- TypeScript / Vite / Module Federation

## ライセンス

MIT
