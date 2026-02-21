/**
 * 開発環境用エントリーポイント
 *
 * ローカル開発時（npm run dev）に使用されます。
 * 本番ビルド（npm run build）では使用されません。
 */

import { XRiftProvider, DevEnvironment } from '@xrift/world-components'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { World } from './World'
import { FpsCounter } from './components/FpsCounter'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <XRiftProvider baseUrl="/">
      <DevEnvironment>
        <World />
        <FpsCounter />
      </DevEnvironment>
    </XRiftProvider>
  </StrictMode>
)
