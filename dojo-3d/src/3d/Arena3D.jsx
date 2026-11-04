import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Fighter3D, { toWorldX } from './Fighter3D.jsx';
import Projectiles3D from './Projectiles3D.jsx';
import { createMatch, stepMatch } from '../game/logic.js';
import { isPressed, endFrame } from '../game/input.js';
import { CHARS, WEAPONS, ENVIRONMENTS } from '../game/data.js';

const END_DELAY_FRAMES = 120;

// Scroll banner texture (武道)
function makeBanner() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f0e0b8'; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = '#1a0708'; g.lineWidth = 16; g.strokeRect(8, 8, 240, 496);
  g.fillStyle = '#8b1a1a';
  g.font = 'bold 150px serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('武', 128, 150);
  g.fillText('道', 128, 370);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- reusable pieces ----------

function Lantern({ x, color = '#ff9a3a' }) {
  return (
    <group position={[x, 4.2, -2]}>
      <mesh>
        <cylinderGeometry args={[0.02, 0.02, 1.4, 6]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[0, -0.9, 0]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight position={[0, -0.9, 0.6]} color={color} intensity={1.2} distance={7} />
    </group>
  );
}

function Pillar({ x, z = -2.5, h = 6, r = 0.25, body, cap, capEmissive }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, h, 16]} />
        <meshStandardMaterial color={body} />
      </mesh>
      <mesh position={[0, h + 0.05, 0]}>
        <boxGeometry args={[r * 2.8, 0.2, r * 2.8]} />
        <meshStandardMaterial color={cap} metalness={0.6} roughness={0.4}
          emissive={capEmissive || '#000000'} emissiveIntensity={capEmissive ? 0.5 : 0} />
      </mesh>
    </group>
  );
}

// Ambient drifting particles (embers, dust, petals, sparkles)
function ParticleSystem({ count, color, yRange, xRange }) {
  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * (xRange[1] - xRange[0]) + xRange[0];
      positions[i * 3 + 1] = Math.random() * (yRange[1] - yRange[0]) + yRange[0];
      positions[i * 3 + 2] = Math.random() * 4 - 2;
      speeds[i] = Math.random() * 0.5 + 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geo, speeds, count };
  }, [count, xRange, yRange]);

  useFrame((_, dt) => {
    const pos = particles.geo.attributes.position.array;
    for (let i = 0; i < particles.count; i++) {
      pos[i * 3 + 1] += particles.speeds[i] * dt;
      pos[i * 3] += (Math.random() - 0.5) * 0.1 * dt * 60;
      if (pos[i * 3 + 1] > yRange[1]) {
        pos[i * 3 + 1] = yRange[0];
        pos[i * 3] = Math.random() * (xRange[1] - xRange[0]) + xRange[0];
      }
    }
    particles.geo.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={particles.geo}>
      <pointsMaterial color={color} size={0.15} transparent opacity={0.6} />
    </points>
  );
}

// Small burst of sparks where a hit lands
function Sparks({ registerSpawn }) {
  const MAX = 90;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3).fill(-100), 3));
    return g;
  }, []);
  const parts = useMemo(
    () => Array.from({ length: MAX }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3() })),
    []
  );
  const next = useRef(0);

  useEffect(() => {
    registerSpawn((origin) => {
      for (let i = 0; i < 14; i++) {
        const k = next.current;
        next.current = (next.current + 1) % MAX;
        const s = parts[k];
        s.p.copy(origin);
        s.v.set((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 2);
        s.life = 0.45;
      }
    });
  }, [registerSpawn, parts]);

  useFrame((_, dt) => {
    const arr = geo.attributes.position.array;
    for (let i = 0; i < MAX; i++) {
      const s = parts[i];
      if (s.life > 0) {
        s.life -= dt;
        s.v.y -= 9 * dt;
        s.p.addScaledVector(s.v, dt);
        arr[i * 3] = s.p.x; arr[i * 3 + 1] = s.p.y; arr[i * 3 + 2] = s.p.z;
      } else {
        arr[i * 3 + 1] = -100;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffd27a" size={0.09} transparent />
    </points>
  );
}

// Flash effect where a special is cast
function SpecialCastEffect({ gsRef }) {
  const effects = useMemo(() => Array.from({ length: 4 }, () => ({
    life: 0, pos: new THREE.Vector3(), kind: '', scale: 1, clock: 0,
  })), []);
  const next = useRef(0);

  useFrame((_, dt) => {
    const gs = gsRef.current;
    for (const f of [gs.p1, gs.p2]) {
      if (f.state === 'attack' && f.moveName === 'special' && f.t === f.move.startup) {
        const k = next.current;
        next.current = (next.current + 1) % effects.length;
        const e = effects[k];
        e.life = 1.0;
        e.pos.set(f.x, f.y, 0);
        e.kind = f.kind;
        e.scale = 1;
        e.clock = 0;
      }
    }
    for (const e of effects) {
      if (e.life > 0) {
        e.life -= dt * 2;
        e.clock += dt;
        e.scale = 1 + e.clock * 2;
      }
    }
  });

  return (
    <group>
      {effects.map((e, i) => e.life > 0 && (
        <group key={i} position={[toWorldX(e.pos.x), 1.0, 0]}>
          {e.kind === 'fire' && (
            <>
              <mesh scale={[e.scale, e.scale, e.scale]}>
                <sphereGeometry args={[0.5, 16, 12]} />
                <meshBasicMaterial color="#ff5a1a" transparent opacity={e.life * 0.5} />
              </mesh>
              <mesh scale={[e.scale * 0.7, e.scale * 0.7, e.scale * 0.7]}>
                <sphereGeometry args={[0.5, 16, 12]} />
                <meshBasicMaterial color="#ffaa22" transparent opacity={e.life * 0.7} />
              </mesh>
            </>
          )}
          {e.kind === 'blades' && (
            <group>
              {[0, 1, 2].map((j) => (
                <mesh key={j} scale={[e.scale, e.scale, e.scale]} rotation={[0, 0, e.clock * 20 + j * 2]}>
                  <boxGeometry args={[0.8, 0.1, 0.05]} />
                  <meshBasicMaterial color="#e8eef5" transparent opacity={e.life * 0.6} />
                </mesh>
              ))}
            </group>
          )}
          {e.kind === 'water' && (
            <mesh scale={[e.scale * 1.5, e.scale, e.scale * 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.6, 0.15, 10, 32, Math.PI * 1.5]} />
              <meshBasicMaterial color="#4fc3f7" transparent opacity={e.life * 0.5} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// ---------- environment scenery ----------

function DojoScene({ t, banner }) {
  return (
    <>
      <mesh position={[0, 5, -3.45]}>
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      <Pillar x={-5.6} body={t.pillar} cap={t.accent} />
      <Pillar x={5.6} body={t.pillar} cap={t.accent} />
      <mesh position={[0, 2.3, -3.4]}>
        <planeGeometry args={[1.5, 2.8]} />
        <meshStandardMaterial map={banner} roughness={0.9} />
      </mesh>
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
    </>
  );
}

function VolcanoScene({ t }) {
  return (
    <>
      {[-6, 0, 6].map((x) => (
        <mesh key={`lava${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 2]}>
          <circleGeometry args={[2.5, 16]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.6} />
        </mesh>
      ))}
      <Pillar x={-5.6} body="#3a1a0a" cap="#ff4400" capEmissive="#ff4400" />
      <Pillar x={5.6} body="#3a1a0a" cap="#ff4400" capEmissive="#ff4400" />
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
      <ParticleSystem count={50} color="#ff6622" yRange={[1, 4]} xRange={[-10, 10]} />
    </>
  );
}

function Bamboo({ x }) {
  return (
    <group position={[x, 0, -2.5]}>
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 7, 8]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.7} />
      </mesh>
      {[-1.5, 1.5].map((y) => (
        <group key={`node${y}`} position={[0, y, 0]}>
          <mesh rotation={[0, 0, 0.5]}>
            <boxGeometry args={[1.2, 0.02, 0.2]} />
            <meshStandardMaterial color="#6aab6a" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[0, 0, -0.5]}>
            <boxGeometry args={[1.2, 0.02, 0.2]} />
            <meshStandardMaterial color="#6aab6a" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ForestScene({ t }) {
  return (
    <>
      {[-8, -4, 0, 4, 8].map((x) => <Bamboo key={`bamboo${x}`} x={x} />)}
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
    </>
  );
}

function TempleScene({ t }) {
  return (
    <>
      <group position={[0, 4.5, -3]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 6]} />
          <meshStandardMaterial color="#2a1a1a" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[22, 0.4, 8]} />
          <meshStandardMaterial color="#4a2a2a" roughness={0.9} />
        </mesh>
      </group>
      <Pillar x={-7} h={7} r={0.3} body={t.pillar} cap={t.accent} />
      <Pillar x={7} h={7} r={0.3} body={t.pillar} cap={t.accent} />
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
    </>
  );
}

function CourtyardScene({ t }) {
  return (
    <>
      <mesh position={[6, 8, -4]}>
        <circleGeometry args={[1.5, 32]} />
        <meshBasicMaterial color="#ffeedd" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3]}>
        <circleGeometry args={[4, 24]} />
        <meshBasicMaterial color="#1a2a4a" transparent opacity={0.3} />
      </mesh>
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
    </>
  );
}

function RooftopScene({ t }) {
  return (
    <>
      {[-8, 8].map((x) => (
        <group key={`neon${x}`} position={[x, 5, -4]}>
          <mesh>
            <boxGeometry args={[2, 1, 0.1]} />
            <meshBasicMaterial color="#ff22aa" />
          </mesh>
          <mesh position={[0, -1.5, 0]}>
            <boxGeometry args={[1.5, 0.8, 0.1]} />
            <meshBasicMaterial color="#22aaff" />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 5]}>
        <planeGeometry args={[30, 8]} />
        <meshBasicMaterial color="#0a0a2a" transparent opacity={0.5} />
      </mesh>
      <Lantern x={-3.6} color={t.lantern} />
      <Lantern x={3.6} color={t.lantern} />
    </>
  );
}

function Palm({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 3.2, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 6.4, 8]} />
        <meshStandardMaterial color="#6a4a2a" roughness={0.85} />
      </mesh>
      {[-1.6, 1.6].map((sx) => (
        <mesh key={`frond${sx}`} rotation={[0, 0.6, 0]} position={[sx, 6.4, 0]}>
          <boxGeometry args={[1.4, 0.02, 0.22]} />
          <meshStandardMaterial color="#7aa85a" roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function DesertScene({ t }) {
  return (
    <>
      <mesh position={[0, 6, -5]}>
        <circleGeometry args={[1.7, 32]} />
        <meshBasicMaterial color="#ffcc66" />
      </mesh>
      {[[-10, -6], [10, -6], [-10, 6], [10, 6]].map(([x, z]) => (
        <Palm key={`palm${x}${z}`} x={x} z={z} />
      ))}
    </>
  );
}

function SkyGardenScene({ t }) {
  return (
    <>
      {[-12, -4, 4, 12].map((x) => (
        <group key={`plat${x}`} position={[x, 0, -1.5]}>
          <mesh castShadow position={[0, 0.15, 0]}>
            <boxGeometry args={[3, 0.12, 1.4]} />
            <meshStandardMaterial color="#8a7a6a" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.3, 0]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[2.8, 0.12, 0.2]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {[-8, 8].map((x) => (
        <group key={`cherry${x}`} position={[x, 0, -3]}>
          <mesh position={[0, 2, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.15, 4, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 4.5, 0]}>
            <sphereGeometry args={[1.3, 16, 12]} />
            <meshStandardMaterial color={t.accent} roughness={0.9} />
          </mesh>
          <mesh position={[-0.7, 4.8, 0]}>
            <sphereGeometry args={[0.6, 12, 10]} />
            <meshStandardMaterial color="#ffa0c8" roughness={0.9} />
          </mesh>
          <mesh position={[0.6, 5.2, 0.3]}>
            <sphereGeometry args={[0.5, 12, 10]} />
            <meshStandardMaterial color="#ff7ac0" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <ParticleSystem count={30} color="#ffc0d0" yRange={[0.5, 6]} xRange={[-12, 12]} />
    </>
  );
}

function CanyonScene({ t }) {
  return (
    <>
      {[[-12, -3], [12, -3], [0, -6]].map(([x, z]) => (
        <mesh key={`rock${x}${z}`} position={[x, 4, z]} castShadow>
          <boxGeometry args={[2.4, 8.4, 0.3]} />
          <meshStandardMaterial color={t.wall2} roughness={0.95} />
        </mesh>
      ))}
      {[[-7, -1], [7, -1]].map(([x, z]) => (
        <mesh key={`boulder${x}`} position={[x, 0.5, z]}>
          <icosahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color={t.accent} roughness={0.9} />
        </mesh>
      ))}
      <ParticleSystem count={35} color="#c9a86c" yRange={[0.1, 3]} xRange={[-10, 10]} />
    </>
  );
}

function Geode({ x, z }) {
  return (
    <group position={[x, 0, z]}>
      {[-0.5, 0.5].map((sx) => (
        <mesh key={`crys${sx}`} position={[sx, 0.4, 0]} castShadow>
          <coneGeometry args={[0.12, 0.8, 6]} />
          <meshStandardMaterial color={sx > 0 ? '#9a5ad8' : '#5a3a9a'}
            emissive={sx > 0 ? '#5a2ac0' : '#3a1a6a'} emissiveIntensity={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function CrystalScene({ t }) {
  return (
    <>
      {[[-12, -3], [12, -3], [-8, -6], [8, -6], [-12, 3], [12, 3]].map(([x, z]) => (
        <Geode key={`geode${x}${z}`} x={x} z={z} />
      ))}
      <pointLight position={[0, 2, -3]} intensity={0.7} distance={12} color={t.lantern} />
      <ParticleSystem count={45} color="#b89af0" yRange={[0.2, 6]} xRange={[-12, 12]} />
    </>
  );
}

const SCENES = {
  dojo: DojoScene,
  volcano: VolcanoScene,
  forest: ForestScene,
  temple: TempleScene,
  courtyard: CourtyardScene,
  rooftop: RooftopScene,
  desert: DesertScene,
  skygarden: SkyGardenScene,
  canyon: CanyonScene,
  crystal: CrystalScene,
};

// Floor, planks, back wall for every environment, then its scenery
function Stage({ env }) {
  const banner = useMemo(makeBanner, []);
  const t = env.theme;
  const Scene = SCENES[env.id] || DojoScene;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color={t.floor} roughness={0.85} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`plank${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -4.5 + i * 0.9]}>
          <planeGeometry args={[40, 0.03]} />
          <meshBasicMaterial color={t.plank} />
        </mesh>
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={`wall${i}`} position={[-9.6 + i * 1.6, 3.5, -3.6]} receiveShadow>
          <boxGeometry args={[1.6, 8, 0.2]} />
          <meshStandardMaterial color={i % 2 ? t.wall1 : t.wall2} roughness={0.9} />
        </mesh>
      ))}
      <Scene t={t} banner={banner} />
    </group>
  );
}

// Runs the match each frame and drives the camera
function GameLoop({ gsRef, spawnRef, onTick, onExit, onFinish }) {
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    if (isPressed('Escape')) {
      endFrame();
      onExit();
      return;
    }
    const gs = gsRef.current;
    stepMatch(gs);

    const x1 = toWorldX(gs.p1.x), x2 = toWorldX(gs.p2.x), mid = (x1 + x2) / 2;
    if (gs.p1.flash === 10 || gs.p2.flash === 10) spawnRef.current(new THREE.Vector3(mid, 1.1, 0));

    camera.position.x += (mid * 0.35 - camera.position.x) * 0.05;
    camera.lookAt(camera.position.x, 1.1, 0);

    onTick(gs);
    endFrame();

    if (gs.done && ++gs.endT > END_DELAY_FRAMES) onFinish(gs.matchWinner, gs.wins);
  });

  return null;
}

export default function Arena3D({ config, onTick, onExit, onFinish }) {
  const gsRef = useRef(null);
  if (gsRef.current === null) gsRef.current = createMatch(config);
  const spawnRef = useRef(() => {});
  const registerSpawn = useRef((fn) => { spawnRef.current = fn; }).current;

  const env = ENVIRONMENTS.find((e) => e.id === config.env) || ENVIRONMENTS[0];

  return (
    <Canvas shadows camera={{ position: [0, 2.1, 8.5], fov: 42 }}>
      <color attach="background" args={[env.bgColor]} />
      <fog attach="fog" args={[env.fogColor, 12, 26]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Stage env={env} />
      <Fighter3D
        getFighter={() => gsRef.current.p1}
        char={CHARS[config.p1Char]}
        weapon={WEAPONS[config.p1Weapon]}
      />
      <Fighter3D
        getFighter={() => gsRef.current.p2}
        char={CHARS[config.p2Char]}
        weapon={WEAPONS[config.p2Weapon]}
      />
      <Projectiles3D gsRef={gsRef} />
      <SpecialCastEffect gsRef={gsRef} />
      <Sparks registerSpawn={registerSpawn} />
      <GameLoop gsRef={gsRef} spawnRef={spawnRef} onTick={onTick} onExit={onExit} onFinish={onFinish} />
    </Canvas>
  );
}
