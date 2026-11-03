import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Fighter3D, { toWorldX } from './Fighter3D.jsx';
import Projectiles3D from './Projectiles3D.jsx';
import { createMatch, stepMatch } from '../game/logic.js';
import { isPressed, endFrame } from '../game/input.js';
import { CHARS, WEAPONS, SPECIALS, ENVIRONMENTS } from '../game/data.js';

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

// Environment-specific stage elements
function Stage({ env }) {
  const banner = useMemo(makeBanner, []);
  const isVolcano = env.id === 'volcano';
  const isForest = env.id === 'forest';
  const isTemple = env.id === 'temple';
  const isCourtyard = env.id === 'courtyard';
  const isRooftop = env.id === 'rooftop';

  const floorColor = isVolcano ? '#3a1a0a' : isForest ? '#1a3a1a' : isTemple ? '#2a1a2a' : isCourtyard ? '#1a2a3a' : isRooftop ? '#1a1a3a' : '#5a2a16';
  const wallColor1 = isVolcano ? '#5a1a0a' : isForest ? '#0a2a0a' : isTemple ? '#1a0a2a' : isCourtyard ? '#0a1a3a' : isRooftop ? '#0a0a2a' : '#2a0a0e';
  const wallColor2 = isVolcano ? '#7a2a0a' : isForest ? '#1a3a1a' : isTemple ? '#2a1a3a' : isCourtyard ? '#1a2a4a' : isRooftop ? '#1a1a4a' : '#3d1217';
  const pillarColor = isVolcano ? '#5a2a0a' : isForest ? '#2a4a2a' : isTemple ? '#2a1a3a' : isCourtyard ? '#1a2a4a' : isRooftop ? '#1a1a3a' : '#4a0f14';
  const accentColor = isVolcano ? '#ff6a00' : isForest ? '#4a8a4a' : isTemple ? '#8a4a8a' : isCourtyard ? '#4a6a8a' : isRooftop ? '#4a4a8a' : '#c9a13b';
  const lanternColor = isVolcano ? '#ff4400' : isForest ? '#66ff66' : isTemple ? '#ff66ff' : isCourtyard ? '#66aaff' : isRooftop ? '#ffff66' : '#ff9a3a';

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1]} receiveShadow>
        <planeGeometry args={[40, 14]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>

      {/* Floor planks/stripes */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`plank${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -4.5 + i * 0.9]}>
          <planeGeometry args={[40, 0.03]} />
          <meshBasicMaterial color={isVolcano ? '#2a0a05' : isForest ? '#0a2a0a' : '#2a1208'} />
        </mesh>
      ))}

      {/* Back wall stripes */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={`wall${i}`} position={[-9.6 + i * 1.6, 3.5, -3.6]} receiveShadow>
          <boxGeometry args={[1.6, 8, 0.2]} />
          <meshStandardMaterial color={i % 2 ? wallColor1 : wallColor2} roughness={0.9} />
        </mesh>
      ))}

      {/* Environment-specific background elements */}
      {isVolcano && (
        <>
          {/* Lava pools */}
          {[-6, 0, 6].map((x) => (
            <mesh key={`lava${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 2]}>
              <circleGeometry args={[2.5, 16]} />
              <meshBasicMaterial color="#ff4400" transparent opacity={0.6} />
            </mesh>
          ))}
          {/* Embers */}
          <particleSystem count={50} color="#ff6622" yRange={[1, 4]} xRange={[-10, 10]} />
        </>
      )}

      {isForest && (
        <>
          {/* Bamboo trees */}
          {[-8, -4, 0, 4, 8].map((x) => (
            <group key={`bamboo${x}`} position={[x, 0, -2.5]}>
              <mesh position={[0, 3.5, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 7, 8]} />
                <meshStandardMaterial color="#4a8a4a" roughness={0.7} />
              </mesh>
              {[-1.5, 1.5].map((y) => (
                <group key={`leaf${y}`} position={[0, y, 0]}>
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
          ))}
        </>
      )}

      {isTemple && (
        <>
          {/* Temple roof structure */}
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
          {/* Temple pillars */}
          {[-7, 7].map((x) => (
            <group key={`tpillar${x}`} position={[x, 0, -2.5]}>
              <mesh position={[0, 3.5, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 7, 12]} />
                <meshStandardMaterial color="#3a1a1a" />
              </mesh>
              <mesh position={[0, 7.1, 0]}>
                <boxGeometry args={[0.9, 0.3, 0.9]} />
                <meshStandardMaterial color="#6a3a3a" metalness={0.5} roughness={0.4} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {isCourtyard && (
        <>
          {/* Moon */}
          <mesh position={[6, 8, -4]}>
            <circleGeometry args={[1.5, 32]} />
            <meshBasicMaterial color="#ffeedd" />
          </mesh>
          {/* Pond reflection */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3]}>
            <circleGeometry args={[4, 24]} />
            <meshBasicMaterial color="#1a2a4a" transparent opacity={0.3} />
          </mesh>
        </>
      )}

      {isRooftop && (
        <>
          {/* Neon signs */}
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
          {/* City skyline silhouette */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 5]}>
            <planeGeometry args={[30, 8]} />
            <meshBasicMaterial color="#0a0a2a" transparent opacity={0.5} />
          </mesh>
        </>
      )}

      {/* Default dojo elements (for non-specific environments) */}
      {!isVolcano && !isForest && !isTemple && !isCourtyard && !isRooftop && (
        <>
          {/* Sun behind the banner */}
          <mesh position={[0, 5, -3.45]}>
            <circleGeometry args={[1.7, 32]} />
            <meshBasicMaterial color="#ffd27a" />
          </mesh>

          {/* Pillars */}
          {[-5.6, 5.6].map((x) => (
            <group key={`pillar${x}`} position={[x, 0, -2.5]}>
              <mesh position={[0, 3, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 6, 16]} />
                <meshStandardMaterial color={pillarColor} />
              </mesh>
              <mesh position={[0, 6.05, 0]}>
                <boxGeometry args={[0.7, 0.2, 0.7]} />
                <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.4} />
              </mesh>
            </group>
          ))}

          {/* Banner */}
          <mesh position={[0, 2.3, -3.4]}>
            <planeGeometry args={[1.5, 2.8]} />
            <meshStandardMaterial map={banner} roughness={0.9} />
          </mesh>

          <Lantern x={-3.6} color={lanternColor} />
          <Lantern x={3.6} color={lanternColor} />
        </>
      )}

      {/* Volcano pillars */}
      {isVolcano && (
        <>
          {[-5.6, 5.6].map((x) => (
            <group key={`vpillar${x}`} position={[x, 0, -2.5]}>
              <mesh position={[0, 3, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 6, 16]} />
                <meshStandardMaterial color="#3a1a0a" />
              </mesh>
              <mesh position={[0, 6.05, 0]}>
                <boxGeometry args={[0.7, 0.2, 0.7]} />
                <meshStandardMaterial color="#ff4400" metalness={0.6} roughness={0.4} emissive="#ff4400" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ))}
        </>
      )}

      {/* Forest lanterns */}
      {isForest && (
        <>
          <Lantern x={-3.6} color="#66ff66" />
          <Lantern x={3.6} color="#66ff66" />
        </>
      )}

      {/* Temple lanterns */}
      {isTemple && (
        <>
          <Lantern x={-3.6} color="#ff66ff" />
          <Lantern x={3.6} color="#ff66ff" />
        </>
      )}

      {/* Courtyard lanterns */}
      {isCourtyard && (
        <>
          <Lantern x={-3.6} color="#66aaff" />
          <Lantern x={3.6} color="#66aaff" />
        </>
      )}

      {/* Rooftop lanterns */}
      {isRooftop && (
        <>
          <Lantern x={-3.6} color="#ffff66" />
          <Lantern x={3.6} color="#ffff66" />
        </>
      )}
    </group>
  );
}

// Particle system for ambient effects
function particleSystem({ count, color, yRange, xRange }) {
  const particles = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * (xRange[1] - xRange[0]) + xRange[0];
      positions[i * 3 + 1] = Math.random() * (yRange[1] - yRange[0]) + yRange[0];
      positions[i * 3 + 2] = Math.random() * 4 - 2;
      sizes[i] = Math.random() * 0.1 + 0.05;
      speeds[i] = Math.random() * 0.5 + 0.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
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

// Special cast visual effect
function SpecialCastEffect({ gsRef }) {
  const effects = useMemo(() => Array.from({ length: 4 }, () => ({
    life: 0,
    pos: new THREE.Vector3(),
    kind: '',
    scale: 1,
    clock: 0,
  })), []);
  const next = useRef(0);

  useEffect(() => {
    // We listen for special casts via gsRef
  }, []);

  useFrame((_, dt) => {
    const gs = gsRef.current;
    // Check for new special casts
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

    // Update effects
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
        <group key={i} position={[toWorldX(e.pos.x), toWorldY(e.pos.y), 0]}>
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
          {e.kind === 'lightning' && (
            <group>
              {[0, 1].map((j) => (
                <mesh key={j} scale={[e.scale, e.scale, e.scale]} rotation={[0, 0, e.clock * 30 + j * 0.5]}>
                  <boxGeometry args={[2, 0.05, 0.05]} />
                  <meshBasicMaterial color="#fff050" transparent opacity={e.life * 0.8} />
                </mesh>
              ))}
            </group>
          )}
          {e.kind === 'earth' && (
            <mesh scale={[e.scale, e.scale, e.scale]} position={[0, 0.5, 0]}>
              <coneGeometry args={[0.6, 1.2, 6]} />
              <meshBasicMaterial color="#c9a86c" transparent opacity={e.life * 0.6} />
            </mesh>
          )}
        </group>
      ))}
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

    // Follow the fighters a little, keeping a side-on view
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

  return (
    <Canvas shadows camera={{ position: [0, 2.1, 8.5], fov: 42 }}>
      <color attach="background" args={[gsRef.current?.env?.bgColor || '#2a0a10']} />
      <fog attach="fog" args={[gsRef.current?.env?.fogColor || '#2a0a10', 12, 26]} />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Stage env={gsRef.current?.env || ENVIRONMENTS[0]} />
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