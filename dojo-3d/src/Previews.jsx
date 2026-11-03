import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { CHARS, WEAPONS } from './game/data.js';
import { createRig } from './3d/rig.js';
import { IDLE, applyPose } from './3d/poses.js';

// A standing 3D fighter for the selection cards. Renders once (frameloop=demand).
function PreviewScene({ char, weapon }) {
  const rig = useMemo(() => {
    const r = createRig(char, weapon);
    applyPose(r, IDLE, 0);
    return r;
  }, [char, weapon]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 4]} intensity={1.2} />
      <primitive object={rig.root} rotation={[0, Math.PI / 2, 0]} />
    </>
  );
}

function Preview({ char, weapon, short }) {
  return (
    <div className={'preview3d' + (short ? ' short' : '')}>
      <Canvas
        frameloop="demand"
        camera={{ position: [0, 1.0, 4.4], fov: 32 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.95, 0)}
      >
        <PreviewScene char={char} weapon={weapon} />
      </Canvas>
    </div>
  );
}

export function FighterPreview({ index }) {
  return <Preview char={CHARS[index]} weapon={WEAPONS[0]} />;
}

export function WeaponPreview({ index }) {
  return <Preview char={CHARS[0]} weapon={WEAPONS[index]} short />;
}
