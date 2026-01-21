import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  AdditiveBlending,
  Vector3,
} from "three";

export interface EmbersProps {
  position?: [number, number, number];
  count?: number;
  spread?: number;
  size?: number;
}

interface Ember {
  x: number;
  y: number;
  z: number;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5);
    float dist = length(vUv - center) * 2.0;

    // 中心から外側へ滑らかに減衰する円形グラデーション
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    alpha = pow(alpha, 1.5);

    // 黄色～オレンジのグラデーション
    vec3 color = mix(vec3(1.0, 0.9, 0.6), vec3(1.0, 0.6, 0.2), dist);

    gl_FragColor = vec4(color, alpha * 0.3);
  }
`;

export const Embers: React.FC<EmbersProps> = ({
  position = [0, 0, 0],
  count = 8,
  spread = 0.5,
  size = 0.4,
}) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const embers = useMemo<Ember[]>(() => {
    return Array.from({ length: count }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      scale: 1,
    }));
  }, [count]);

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  const resetEmber = (e: Ember) => {
    e.x = (Math.random() - 0.5) * spread;
    e.y = Math.random() * 0.2;
    e.z = (Math.random() - 0.5) * spread;
    e.vy = 0.3 + Math.random() * 0.3;
    e.maxLife = 0.8 + Math.random() * 0.7;
    e.life = e.maxLife;
    e.scale = 0.5 + Math.random() * 0.5;
  };

  // 初期化
  useMemo(() => {
    embers.forEach((e) => {
      resetEmber(e);
      e.life = Math.random() * e.maxLife;
    });
  }, [embers, spread]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const camera = state.camera;
    const cameraWorldPos = camera.getWorldPosition(new Vector3());

    embers.forEach((e, i) => {
      e.life -= delta;
      if (e.life <= 0) {
        resetEmber(e);
      }

      const lifeRatio = e.life / e.maxLife;

      // ゆっくり上昇
      e.y += e.vy * delta;

      // ゆらぎ
      e.x += (Math.random() - 0.5) * 0.02;
      e.z += (Math.random() - 0.5) * 0.02;

      // 上に上がるにつれてxを中央に寄せる（zはビルボードなので不要）
      const centeringFactor = 1.0 - lifeRatio; // 0→1（上に行くほど大きく）
      const centeredX = e.x * (1.0 - centeringFactor * 0.8);

      dummy.position.set(
        position[0] + centeredX,
        position[1] + e.y,
        position[2] + e.z
      );

      // Y軸ビルボード
      const dx = cameraWorldPos.x - dummy.position.x;
      const dz = cameraWorldPos.z - dummy.position.z;
      dummy.rotation.y = Math.atan2(dx, dz);

      // スケール（フェードアウト）
      const currentScale = size * e.scale * lifeRatio;
      dummy.scale.setScalar(currentScale);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      material={material}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
    </instancedMesh>
  );
};
