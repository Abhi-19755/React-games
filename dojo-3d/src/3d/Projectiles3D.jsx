import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { toWorldX, toWorldY } from './Fighter3D.jsx';

// A small pool of reusable meshes: ninja blades, fire ball, water wave,
// lightning bolt, earth spike.
const POOL = 10;

function makeSlot() {
  const group = new THREE.Group();

  // Ninja blades: three spinning shuriken blades
  const blades = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#e8eef5', metalness: 0.8, roughness: 0.25, emissive: '#3a4a60', emissiveIntensity: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.03), steel);
    b.position.set(Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0);
    b.rotation.z = a;
    blades.add(b);
  }

  // Fire blast: glowing orange ball with a hot core and a trail
  const fire = new THREE.Group();
  const flame = new THREE.MeshStandardMaterial({ color: '#ff5a1a', emissive: '#ff3a00', emissiveIntensity: 1.2, transparent: true, opacity: 0.9 });
  fire.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), flame));
  fire.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffe066' })));
  for (const x of [-0.35, -0.6]) {
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.2 - (x * -0.2), 10, 8), new THREE.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.45 }));
    trail.position.x = x;
    fire.add(trail);
  }

  // Water wave: a crescent that rolls forward
  const water = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.14, 10, 28, Math.PI),
    new THREE.MeshStandardMaterial({ color: '#4fc3f7', emissive: '#0a6fa8', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 })
  );
  water.rotation.z = -Math.PI / 2;

  // Lightning bolt: zigzag arc with bright core
  const lightning = new THREE.Group();
  const boltGeo = new THREE.BufferGeometry();
  const boltPos = [];
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const y = -0.5 + i * 0.125;
    const x = (i % 2) * 0.12;
    boltPos.push(x, y, 0);
  }
  boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(boltPos), 3));
  lightning.add(new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: '#fff050', transparent: true, opacity: 0.9 })));
  lightning.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
  lightning.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff050', transparent: true, opacity: 0.35 })));

  // Earth spike: jagged rock that rises from the ground
  const earth = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: '#c9a86c', roughness: 0.9, emissive: '#7a5a2a', emissiveIntensity: 0.3 });
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 5), rockMat);
  spike.rotation.x = Math.PI / 2;
  spike.position.y = -0.4;
  earth.add(spike);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffaa33', transparent: true, opacity: 0.35 }));
  glow.position.y = -0.1;
  earth.add(glow);

  group.add(blades, fire, water, lightning, earth);
  return { group, blades, fire, water, lightning, earth, clock: 0 };
}

export default function Projectiles3D({ gsRef }) {
  const slots = useMemo(() => Array.from({ length: POOL }, makeSlot), []);

  useFrame((_, dt) => {
    const list = gsRef.current.proj;
    for (let i = 0; i < POOL; i++) {
      const s = slots[i];
      const p = list[i];
      if (!p) { s.group.visible = false; continue; }

      s.group.visible = true;
      s.clock += dt;
      s.group.position.set(toWorldX(p.x), toWorldY(p.y), 0.1);
      s.group.scale.x = p.vx >= 0 ? 1 : -1;
      s.blades.visible = p.kind === 'blades';
      s.fire.visible = p.kind === 'fire';
      s.water.visible = p.kind === 'water';
      s.lightning.visible = p.kind === 'lightning';
      s.earth.visible = p.kind === 'earth';

      if (p.kind === 'blades') s.blades.rotation.z -= dt * 28;
      if (p.kind === 'fire') s.fire.scale.setScalar(1 + Math.sin(s.clock * 30) * 0.12);
      if (p.kind === 'water') s.water.scale.y = 1 + Math.sin(s.clock * 10) * 0.15;
      if (p.kind === 'lightning') {
        s.lightning.rotation.z += dt * 20;
        s.lightning.scale.setScalar(1 + Math.sin(s.clock * 40) * 0.2);
      }
      if (p.kind === 'earth') {
        s.earth.rotation.z += dt * 6;
        s.earth.scale.y = 1 + Math.sin(s.clock * 12) * 0.15;
      }
    }
  });

  return <>{slots.map((s, i) => <primitive key={i} object={s.group} />)}</>;
}