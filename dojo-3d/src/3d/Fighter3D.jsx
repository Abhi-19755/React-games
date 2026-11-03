import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createRig, setGlow } from './rig.js';
import { IDLE, targetPose, attackPose, lerpPose, applyPose, POSES } from './poses.js';
import { GROUND } from '../game/data.js';

// Game coordinates (960 x 540, floor at y = GROUND) -> 3D world units
export const toWorldX = (x) => (x - 480) / 100;
export const toWorldY = (y) => (GROUND - y) / 100;

export default function Fighter3D({ getFighter, char, weapon }) {
  const rig = useMemo(() => createRig(char, weapon), [char, weapon]);
  const pose = useRef(JSON.parse(JSON.stringify(IDLE)));
  const clock = useRef(0);
  const tmp = useRef(null);
  tmp.current = rig;

  useFrame((_, dt) => {
    const f = getFighter();
    clock.current += dt;
    const t = clock.current;

    rig.root.position.set(toWorldX(f.x), toWorldY(f.y), 0);
    // The rig faces +Z; turn it to face along X (right or left)
    rig.root.rotation.y = f.facing > 0 ? Math.PI / 2 : -Math.PI / 2;

    // Attacks follow their keyframes closely; other states blend softly
    if (f.state === 'attack' && f.move && !f.move.cast) {
      lerpPose(pose.current, attackPose(f), 0.75);
    } else if (f.state === 'attack' && f.move?.evade) {
      lerpPose(pose.current, POSES.roll, 0.8);
    } else if (f.rolling) {
      lerpPose(pose.current, POSES.roll, 0.4);
    } else {
      lerpPose(pose.current, targetPose(f, t), f.state === 'hit' ? 0.5 : 0.3);
    }
    applyPose(rig, pose.current, t);
    setGlow(rig, f.flash || 0, f.meter >= 100, t);
  });

  return <primitive object={rig.root} />;
}