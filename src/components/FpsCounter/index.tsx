import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export const FpsCounter = () => {
  const ref = useRef<HTMLDivElement | null>(null)
  const frames = useRef(0)
  const lastTime = useRef(performance.now())

  if (!ref.current) {
    const div = document.createElement('div')
    div.style.cssText =
      'position:fixed;top:8px;left:8px;z-index:9999;background:rgba(0,0,0,0.7);color:#0f0;font:bold 14px monospace;padding:4px 8px;border-radius:4px;pointer-events:none;'
    document.body.appendChild(div)
    ref.current = div
  }

  useFrame(() => {
    frames.current++
    const now = performance.now()
    const elapsed = now - lastTime.current
    if (elapsed >= 500) {
      const fps = Math.round((frames.current * 1000) / elapsed)
      if (ref.current) ref.current.textContent = `${fps} FPS`
      frames.current = 0
      lastTime.current = now
    }
  })

  return null
}
