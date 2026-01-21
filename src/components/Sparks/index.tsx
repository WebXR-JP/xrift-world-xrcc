import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  AdditiveBlending,
  PointsMaterial,
} from "three";

export interface SparksProps {
  count?: number;
  position?: [number, number, number];
  spread?: number;
  speed?: number;
  size?: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export const Sparks: React.FC<SparksProps> = ({
  count = 30,
  position = [0, 0, 0],
  spread = 0.3,
  speed = 1.5,
  size = 0.08,
}) => {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsMaterial>(null);

  // パーティクルの状態を管理
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0,
    }));
  }, [count]);

  // 初期ジオメトリを作成
  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setAttribute("size", new Float32BufferAttribute(sizes, 1));

    return geo;
  }, [count]);

  // パーティクルをリセット
  const resetParticle = (p: Particle) => {
    p.x = (Math.random() - 0.5) * spread;
    p.y = 0;
    p.z = (Math.random() - 0.5) * spread;
    p.vx = (Math.random() - 0.5) * 1.5; // 横方向の初期速度を増加
    p.vy = speed * (0.8 + Math.random() * 0.5); // 上方向の速度を抑える
    p.vz = (Math.random() - 0.5) * 1.5; // 横方向の初期速度を増加
    p.maxLife = 2.0 + Math.random() * 2.0;
    p.life = p.maxLife;
  };

  // 初期化
  useMemo(() => {
    particles.forEach((p) => {
      resetParticle(p);
      p.life = Math.random() * p.maxLife; // 最初はランダムな位置から
    });
  }, [particles, spread, speed]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !materialRef.current) return;

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;

    particles.forEach((p, i) => {
      // 更新
      p.life -= delta;
      if (p.life <= 0) {
        resetParticle(p);
      }

      // 寿命に基づいたイージング（easeOutQuad: 最初は速く、徐々に減速）
      const lifeRatio = p.life / p.maxLife;
      const easedSpeed = lifeRatio * lifeRatio; // easeOutQuad

      // 物理シミュレーション（イージングを適用）
      p.x += p.vx * delta * easedSpeed;
      p.y += p.vy * delta * easedSpeed;
      p.z += p.vz * delta * easedSpeed;

      // 風の影響（ゆらぎ）- 強めにしてちじれた動きに
      p.vx += (Math.random() - 0.5) * 3.0 * delta;
      p.vz += (Math.random() - 0.5) * 3.0 * delta;
      p.vy += (Math.random() - 0.5) * 1.0 * delta; // 上下方向にもゆらぎ

      // 位置を設定
      const i3 = i * 3;
      positions[i3] = p.x;
      positions[i3 + 1] = p.y;
      positions[i3 + 2] = p.z;

      // 寿命に応じた色（フェードアウトは透明度に含める）
      // オレンジ→赤→暗い赤へのグラデーション
      const fadeAlpha = Math.pow(lifeRatio, 0.5); // フェードアウト用のイージング
      if (lifeRatio > 0.5) {
        // 明るいオレンジ～黄色
        colors[i3] = 1.0 * fadeAlpha;
        colors[i3 + 1] = (0.6 + lifeRatio * 0.4) * fadeAlpha;
        colors[i3 + 2] = 0.2 * fadeAlpha;
      } else {
        // 赤～暗い赤
        colors[i3] = (0.8 + lifeRatio * 0.4) * fadeAlpha;
        colors[i3 + 1] = lifeRatio * 0.6 * fadeAlpha;
        colors[i3 + 2] = 0.0;
      }

      // サイズ（消えるにつれて小さく）
      sizes[i] = size * lifeRatio;
    });

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <group position={position}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          ref={materialRef}
          size={size}
          vertexColors
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
