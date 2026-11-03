import { GROUND } from '../game/data.js';
import { HIP } from './rig.js';

// Joint angles in radians. Negative shoulder/hip = limb swings forward.
// Positive elbow/knee = bends. Positive torso = leans forward.
export const IDLE = {
  hipY: 0, torso: 0.05, head: -0.05,
  lSh: -1.0, lEl: -1.9, rSh: -1.0, rEl: -1.9,
  lHip: 0.25, lKnee: 0.2, rHip: -0.35, rKnee: 0.2,
};

const P = (o) => ({ ...IDLE, ...o });

export const POSES = {
  jump: P({ hipY: 0.05, torso: 0.1, lSh: -1.8, lEl: -0.6, rSh: -1.8, rEl: -0.6, lHip: -0.9, lKnee: 1.4, rHip: -0.9, rKnee: 1.4 }),
  flyKick: P({ torso: -0.2, rHip: -1.5, rKnee: 0.05, lHip: -0.6, lKnee: 1.0 }),
  hit: P({ torso: -0.35, head: -0.45, lSh: -0.2, lEl: -0.5, rSh: 0.2, rEl: -0.5, lHip: 0.25, lKnee: 0.3, rHip: 0.25, rKnee: 0.3, hipY: -0.05 }),
  block: P({ torso: 0.05, lSh: -1.2, lEl: -2.2, rSh: -1.2, rEl: -2.2, rHip: -0.3, rKnee: 0.3, lHip: 0.2, lKnee: 0.3 }),
  roll:  P({ torso: -0.1, hipY: -0.15, lSh: -0.5, lEl: -1.0, rSh: -0.5, rEl: -1.0, lHip: -0.6, lKnee: 1.2, rHip: -0.6, rKnee: 1.2 }),
};

// Each attack has a windup (chamber) pose and a strike (extended) pose.
// attackPose() moves through them using the move's real frame timing,
// so every punch and kick has anticipation, impact and recovery.
const ATK = {
  jab: {
    windup: P({ torso: -0.05, rSh: -0.7, rEl: -2.5 }),
    strike: P({ torso: 0.25, rSh: -1.6, rEl: -0.02, rHip: -0.5, rKnee: 0.25, lHip: 0.35, lKnee: 0.3 }),
  },
  hook: {
    windup: P({ torso: -0.25, rSh: 0.4, rEl: -2.5, hipY: -0.1 }),
    strike: P({ torso: 0.35, rSh: -1.2, rEl: -1.3, hipY: -0.15, lHip: 0.3 }),
  },
  kick: {
    windup: P({ torso: -0.2, rHip: -1.0, rKnee: 2.0, lHip: 0.1, lKnee: 0.4, hipY: -0.08, lSh: -1.3, rSh: -0.6, rEl: -1.2 }),
    strike: P({ torso: -0.25, rHip: -1.55, rKnee: 0.05, hipY: -0.12, lHip: 0.1, lKnee: 0.35, lSh: -1.3, rSh: -0.5, rEl: -1.0 }),
  },
  uppercut: {
    windup: P({ hipY: -0.35, torso: -0.1, rSh: 0.4, rEl: -2.6, lSh: -1.2, lEl: -2.0, lKnee: 0.6, rKnee: 0.7, lHip: 0.5, rHip: -0.3 }),
    strike: P({ hipY: -0.05, torso: 0.2, rSh: -2.5, rEl: -0.3, lSh: -0.9, lEl: -1.6 }),
  },
  sweep: {
    windup: P({ torso: -0.1, hipY: -0.2, rHip: 0.6, rKnee: 1.5, lHip: -0.3, lKnee: 0.9 }),
    strike: P({ torso: 0.7, hipY: -0.55, rHip: -1.45, rKnee: 0.1, lHip: 0.6, lKnee: 1.2, rSh: -0.9, rEl: -0.4, lSh: -0.9, lEl: -0.5 }),
  },
  special: {
    windup: P({ torso: -0.15, hipY: -0.2, lSh: -2.0, lEl: -1.5, rSh: -2.0, rEl: -1.5 }),
    strike: P({ torso: 0.25, hipY: -0.25, lSh: -1.6, lEl: -0.1, rSh: -1.6, rEl: -0.1, rHip: -0.4, rKnee: 0.5 }),
  },
};

export function walkPose(t) {
  const s = Math.sin(t * 8);
  return P({
    torso: 0.05,
    hipY: Math.abs(s) * 0.025,
    rHip: s * 0.5, rKnee: Math.max(0, -s) * 0.9,
    lHip: -s * 0.5, lKnee: Math.max(0, s) * 0.9,
    rSh: -s * 0.4 - 0.9, lSh: s * 0.4 - 0.9,
    rEl: -1.6, lEl: -1.6,
  });
}

const smooth = (x) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

const mix = (a, b, k) => {
  const o = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
};

// Pose for a fighter who is in the middle of an attack, timed by frames
export function attackPose(f) {
  if (f.moveName === 'jump_kick') return { ...POSES.flyKick };
  const def = ATK[f.moveName] || ATK.jab;
  const m = f.move, t = f.t;
  const S = m.startup, A = m.active, T = f.total;

  if (t < S) return mix(IDLE, def.windup, smooth(t / Math.max(1, S)));       // chamber
  if (t < S + A) return mix(def.windup, def.strike, smooth((t - S) / 2));     // strike
  return mix(def.strike, IDLE, smooth((t - S - A) / Math.max(1, T - S - A))); // recover
}

// Pose for a fighter who is not attacking
export function targetPose(f, t) {
  if (f.state === 'hit') return POSES.hit;
  if (f.state === 'block') return POSES.block;
  if (f.y < GROUND - 2) return POSES.jump;
  if (Math.abs(f.vx) > 0.1) return walkPose(t);
  return IDLE;
}

export function lerpPose(cur, target, amount) {
  for (const k in cur) cur[k] += (target[k] - cur[k]) * amount;
}

// Set every joint on the rig from a pose, with a little breathing motion
export function applyPose(rig, p, t) {
  const breath = Math.sin(t * 2.2) * 0.02;
  rig.hips.position.y = HIP + p.hipY;
  rig.torso.rotation.x = p.torso + breath;
  rig.head.rotation.x = p.head;
  rig.arms.L.shoulder.rotation.x = p.lSh;
  rig.arms.L.elbow.rotation.x = p.lEl;
  rig.arms.R.shoulder.rotation.x = p.rSh;
  rig.arms.R.elbow.rotation.x = p.rEl;
  rig.legs.L.hip.rotation.x = p.lHip;
  rig.legs.L.knee.rotation.x = p.lKnee;
  rig.legs.R.hip.rotation.x = p.rHip;
  rig.legs.R.knee.rotation.x = p.rKnee;
}
