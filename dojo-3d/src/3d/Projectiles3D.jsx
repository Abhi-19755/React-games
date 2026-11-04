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

  // Wind slash: a crescent gust blade
  const wind = new THREE.Group();
  const windMat = new THREE.MeshStandardMaterial({ color: '#88ddaa', emissive: '#44aa66', emissiveIntensity: 0.8, transparent: true, opacity: 0.75 });
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 8, 20, Math.PI * 1.2), windMat);
  arc.rotation.z = -Math.PI / 4;
  wind.add(arc);
  for (const oy of [-0.15, 0.15]) {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: '#aaffcc', transparent: true, opacity: 0.5 }));
    streak.position.set(-0.2, oy, 0);
    wind.add(streak);
  }

  // Thunder clap: pulsing shockwave sphere with ring
  const thunder = new THREE.Group();
  const thunderCore = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({ color: '#aaddff', emissive: '#6699cc', emissiveIntensity: 1.0, transparent: true, opacity: 0.8 }));
  thunder.add(thunderCore);
  const thunderRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 24), new THREE.MeshBasicMaterial({ color: '#ddeeff', transparent: true, opacity: 0.4 }));
  thunderRing.rotation.x = Math.PI / 2;
  thunder.add(thunderRing);
  const thunderSpark = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  thunder.add(thunderSpark);

  // Shadow strike: dark phantom silhouette dash
  const shadow = new THREE.Group();
  const shadowMat = new THREE.MeshStandardMaterial({ color: '#2a1040', emissive: '#6a2a8a', emissiveIntensity: 0.9, transparent: true, opacity: 0.7 });
  const shadowCore = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), shadowMat);
  shadow.add(shadowCore);
  for (const dx of [-0.3, -0.55]) {
    const trail = new THREE.Mesh(new THREE.SphereGeometry(0.18 + dx * 0.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a1a6a', transparent: true, opacity: 0.35 }));
    trail.position.x = dx;
    shadow.add(trail);
  }
  const shadowEdge = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: '#cc66ff', transparent: true, opacity: 0.6 }));
  shadowEdge.position.set(0.15, 0, 0);
  shadow.add(shadowEdge);

  group.add(blades, fire, water, lightning, earth, wind, thunder, shadow);
  return { group, blades, fire, water, lightning, earth, wind, thunder, shadow, clock: 0 };
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
      s.wind.visible = p.kind === 'wind';
      s.thunder.visible = p.kind === 'thunder';
      s.shadow.visible = p.kind === 'shadow';

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
      if (p.kind === 'wind') {
        s.wind.rotation.z += dt * 15;
        s.wind.scale.setScalar(1 + Math.sin(s.clock * 18) * 0.1);
      }
      if (p.kind === 'thunder') {
        s.thunder.scale.setScalar(1 + Math.sin(s.clock * 25) * 0.18);
        s.thunder.rotation.y += dt * 8;
      }
      if (p.kind === 'shadow') {
        s.shadow.scale.x = 1 + Math.sin(s.clock * 35) * 0.15;
        s.shadow.children[0].rotation.y += dt * 12;
      }
    }
  });

  return <>{slots.map((s, i) => <primitive key={i} object={s.group} />)}</>;
}