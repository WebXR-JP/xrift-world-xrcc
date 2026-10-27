import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import federation from '@originjs/vite-plugin-federation'
import { xriftDev } from '@xrift/sdk/vite'

export default defineConfig({
  plugins: [
    react(),
    // ローカル開発で <Item itemId> を本番と同じバンドルで動かす（xrift login のトークンを開発サーバーが付ける）
    xriftDev(),
    dts({
      insertTypesEntry: true,
    }),
    federation({
      name: 'xrift_xrcc',
      filename: 'remoteEntry.js',
      exposes: {
        './World': './src/index.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
        },
        'react-dom/client': {
          singleton: true,
        },
        'react/jsx-runtime': {
          singleton: true,
        },
        three: {
          singleton: true,
          requiredVersion: '^0.176.0',
        },
        '@react-three/fiber': {
          singleton: true,
          requiredVersion: '^9.3.0',
        },
        '@react-three/rapier': {
          singleton: true,
          requiredVersion: '^2.1.0',
        },
        '@react-three/drei': {
          singleton: true,
          requiredVersion: '^10.7.3',
        },
        // world-components が内部で使う。ホストから借りる
        '@react-three/uikit': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
        '@pmndrs/uikit': {
          singleton: true,
          requiredVersion: '^1.0.0',
        },
        '@xrift/world-components': {
          singleton: true,
          requiredVersion: '^0.1.0',
        },
      },
    }),
  ],
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    assetsDir: '',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
})
