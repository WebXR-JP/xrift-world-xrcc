import { useEffect, useRef } from 'react'
import { useXRift } from '@xrift/world-components'

export interface BackgroundAudioProps {
  /** 音声ファイルのパス（public/からの相対パス） */
  src: string
  /** 音量 0〜1（デフォルト: 1） */
  volume?: number
  /** ループ再生（デフォルト: true） */
  loop?: boolean
  /** 自動再生（デフォルト: true） */
  autoPlay?: boolean
}

export const BackgroundAudio: React.FC<BackgroundAudioProps> = ({
  src,
  volume = 1,
  loop = true,
  autoPlay = true,
}) => {
  const { baseUrl } = useXRift()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(`${baseUrl}${src}`)
    audio.loop = loop
    audio.volume = volume
    audioRef.current = audio

    if (autoPlay) {
      // ユーザーインタラクション後に再生を試みる
      const playAudio = () => {
        audio.play().catch(() => {
          // 自動再生がブロックされた場合、クリック時に再生
          const handleClick = () => {
            audio.play()
            document.removeEventListener('click', handleClick)
          }
          document.addEventListener('click', handleClick)
        })
      }
      playAudio()
    }

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [baseUrl, src, loop, volume, autoPlay])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  return null
}
