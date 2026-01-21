import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRift, useUsers } from "@xrift/world-components";
import { Vector3 } from "three";

export interface SpatialAudioProps {
  /** 音声ファイルのパス（public/からの相対パス） */
  src: string;
  /** 音源の位置 */
  position?: [number, number, number];
  /** 最大音量 0〜1（デフォルト: 1） */
  maxVolume?: number;
  /** 音が最大で聞こえる距離（デフォルト: 1） */
  refDistance?: number;
  /** 音が聞こえなくなる距離（デフォルト: 20） */
  maxDistance?: number;
  /** ループ再生（デフォルト: true） */
  loop?: boolean;
}

export const SpatialAudio: React.FC<SpatialAudioProps> = ({
  src,
  position = [0, 0, 0],
  maxVolume = 1,
  refDistance = 1,
  maxDistance = 20,
  loop = true,
}) => {
  const { baseUrl } = useXRift();
  const { getLocalMovement } = useUsers();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const sourcePosition = useRef(new Vector3(...position));

  useEffect(() => {
    sourcePosition.current.set(...position);
  }, [position]);

  useEffect(() => {
    const audio = new Audio(`${baseUrl}${src}`);
    audio.loop = loop;
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const setupAudioContext = () => {
      if (audioContextRef.current) return;

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      gainNodeRef.current = gainNode;

      const source = audioContext.createMediaElementSource(audio);
      sourceRef.current = source;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
    };

    const playAudio = async () => {
      try {
        setupAudioContext();

        if (audioContextRef.current?.state === "suspended") {
          await audioContextRef.current.resume();
        }

        await audio.play();
      } catch {
        const handleInteraction = async () => {
          setupAudioContext();

          if (audioContextRef.current?.state === "suspended") {
            await audioContextRef.current.resume();
          }

          audio.play();
          document.removeEventListener("click", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      }
    };

    playAudio();

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      gainNodeRef.current = null;
      sourceRef.current = null;
    };
  }, [baseUrl, src, loop]);

  useFrame(() => {
    if (!gainNodeRef.current) return;

    const movement = getLocalMovement();
    if (!movement) return;

    const listenerPos = new Vector3(
      movement.position.x,
      movement.position.y,
      movement.position.z
    );

    const distance = listenerPos.distanceTo(sourcePosition.current);

    // 距離に応じた音量計算
    let volume = 0;
    if (distance <= refDistance) {
      volume = maxVolume;
    } else if (distance >= maxDistance) {
      volume = 0;
    } else {
      // 線形フェードアウト
      const t = (distance - refDistance) / (maxDistance - refDistance);
      volume = maxVolume * (1 - t);
    }

    gainNodeRef.current.gain.value = volume;
  });

  return null;
};
