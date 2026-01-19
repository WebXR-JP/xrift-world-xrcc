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
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  useEffect(() => {
    const audio = new Audio(`${baseUrl}${src}`)
    audio.loop = loop
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    const setupAudioContext = () => {
      if (audioContextRef.current) return

      // Web Audio API を使用（iOS対応）
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      // GainNode で音量制御
      const gainNode = audioContext.createGain()
      gainNode.gain.value = volume
      gainNodeRef.current = gainNode

      // Audio要素をソースとして接続
      const source = audioContext.createMediaElementSource(audio)
      sourceRef.current = source

      // 接続: source -> gain -> destination
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
    }

    const playAudio = async () => {
      try {
        setupAudioContext()

        // AudioContext が suspended の場合は resume
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }

        await audio.play()
      } catch {
        // 自動再生がブロックされた場合、クリック/タッチ時に再生
        const handleInteraction = async () => {
          setupAudioContext()

          if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume()
          }

          audio.play()
          document.removeEventListener('click', handleInteraction)
          document.removeEventListener('touchstart', handleInteraction)
        }
        document.addEventListener('click', handleInteraction)
        document.addEventListener('touchstart', handleInteraction)
      }
    }

    if (autoPlay) {
      playAudio()
    }

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null

      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      gainNodeRef.current = null
      sourceRef.current = null
    }
  }, [baseUrl, src, loop, autoPlay, volume])

  // 音量変更時の処理
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume
    }
  }, [volume])

  return null
}
