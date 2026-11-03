import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Burst ring expansion at the point where a hit lands. Scales up over ~0.5s
// and fades out. Driven by the same trigger Spawn callback used by Sparks.
const MAX = 64;

export default function HitFlash({ registerHit, count = MAX }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3).fill(-100), 3));
    return g;
  }, []);
  const parts = useMemo(
    () => Array.from({ length: MAX }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: Math.random() * Math.PI * 2 })),
    []
  );
  const next = useRef(0);

  useEffect(() => { if (!registerHit) return;
    registerHit((origin) => {
      const idx = next.current % MAX;
      next.current++;
      const s = parts[idx];
      s.p.copy(origin);
      s.v.set((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 3);
      s.life = 0.5;
      s.r = Math.random() * Math.PI * 2;
    });
  }, [registerHit]);

  useFrame((_, dt) => {
    const arr = geo.attributes.position.array;
    for (let i = 0; i < MAX; i++) {
      const s = parts[i];
      if (s.life > 0) {
        s.life -= dt;
        s.v.y -= 9 * dt;
        s.p.addScaledVector(s.v, dt);
        arr[i * 3] = s.p.x;
        arr[i * 3 + 1] = s.p.y;
        arr[i * 3 + 2] = s.p.z;
      } else {
        arr[i * 3 + 1] = -100;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffe8a0" size={0.14} transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}
