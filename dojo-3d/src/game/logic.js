import { CHARS, WEAPONS, MOVES, HAND_MOVES, P1K, P2K, GROUND, W, SPECIAL_COST } from './data.js';
import { readInput } from './input.js';

const NO_WEAPON = WEAPONS[0];

// Special projectiles: speed (px/frame), damage, lifetime, screen height, hit width
export const PROJ = {
  blades: { speed: 12,  dmg: 16, life: 70,  y: GROUND - 100, w: 40 },
  fire:   { speed: 8,   dmg: 20, life: 100, y: GROUND - 70,  w: 36 },
  water:  { speed: 6.5, dmg: 14, life: 130, y: GROUND - 40,  w: 70 },
};

export function makeFighter(char, x, facing, isAI, keys, label, weapon = NO_WEAPON) {
  return {
    char, label, isAI, keys, weapon,
    kind: char.special,                 // which special power this fighter has
    x, facing, y: GROUND, vx: 0, vy: 0,
    hp: 100, meter: 0, state: 'idle', stun: 0,
    t: 0, total: 0, move: null, moveName: null, hitDone: false, cast: false,
    combo: 0, comboT: 0, aiCool: 0, aiBlock: 0,
    flash: 0,
  };
}

function startMove(f, name) {
  const m = MOVES[name];
  f.state = 'attack'; f.move = m; f.moveName = name;
  f.t = 0; f.hitDone = false; f.cast = false;
  // Total length of this move in frames; hand moves are slowed by the weapon
  f.total = m.startup + m.active + m.recovery + (HAND_MOVES.has(name) ? f.weapon.slow : 0);
  if (m.cost) f.meter -= m.cost;
  if (name === 'jump_kick') f.vx = f.facing * 4;
}

function endMove(f) {
  f.state = 'idle'; f.move = null; f.moveName = null;
}

function aiInput(f, opp) {
  const r = { left: false, right: false, up: false, down: false, block: false,
              jab: false, kick: false, hook: false, special: false };
  const d = opp.x - f.x, dist = Math.abs(d);
  const fwd = d > 0 ? 'right' : 'left', back = d > 0 ? 'left' : 'right';
  f.aiCool = Math.max(0, f.aiCool - 1);

  if (dist > 120) r[fwd] = true;
  else if (dist < 70 && Math.random() < 0.3) r[back] = true;

  if (opp.state === 'attack' && dist < 140 && Math.random() < 0.5) f.aiBlock = 12;
  if (f.aiBlock > 0) { r.block = true; f.aiBlock--; }

  // Use the special as soon as the bar is full and the opponent is in range of a throw
  if (f.meter >= SPECIAL_COST && f.state !== 'attack' && f.aiCool === 0 && Math.random() < 0.04) {
    r.special = true; f.aiCool = 40;
  }

  if (dist < 120 && f.aiCool === 0 && f.state !== 'attack' && Math.random() < 0.05) {
    f.aiCool = 30;
    const roll = Math.random();
    if (roll < 0.35) r.jab = true;
    else if (roll < 0.55) r.hook = true;
    else if (roll < 0.75) r.kick = true;
    else if (roll < 0.85) { r.down = true; r.jab = true; }   // uppercut
    else { r.down = true; r.kick = true; }                   // sweep
  }
  if (f.y < GROUND - 2 && Math.random() < 0.1) r.kick = true; // flying kick
  if (Math.random() < 0.004) r.up = true;
  return r;
}

function updateFighter(f, opp) {
  const c = f.char, grounded = f.y >= GROUND;
  const inp = f.isAI ? aiInput(f, opp) : readInput(f.keys);
  f.facing = opp.x >= f.x ? 1 : -1;
  if (f.comboT > 0) f.comboT--; else f.combo = 0;
  if (f.flash > 0) f.flash--;

  if (f.stun > 0) {
    f.stun--; f.vx *= 0.85;
    if (f.stun === 0) f.state = 'idle';
  } else if (f.state === 'attack') {
    const m = f.move; f.t++;
    if (m.air) {
      if ((grounded && f.t > m.startup) || f.t >= m.startup + m.active + m.recovery) endMove(f);
    } else {
      const lunging = m.lunge && f.t >= m.startup && f.t < m.startup + m.active;
      f.vx = lunging ? f.facing * m.lunge : 0;
      if (f.t >= f.total) endMove(f);
    }
  } else {
    f.vx = 0;
    if (inp.left) f.vx = -c.speed;
    if (inp.right) f.vx = c.speed;
    if (grounded && inp.block) { f.state = 'block'; f.vx *= 0.3; }
    else {
      f.state = 'idle';
      if (grounded) {
        if (inp.up) f.vy = -14;
        if (inp.special && f.meter >= SPECIAL_COST) startMove(f, 'special');
        else if (inp.jab && inp.down) startMove(f, 'uppercut');
        else if (inp.kick && inp.down) startMove(f, 'sweep');
        else if (inp.jab) startMove(f, 'jab');
        else if (inp.hook) startMove(f, 'hook');
        else if (inp.kick) startMove(f, 'kick');
      } else if (inp.kick) {
        startMove(f, 'jump_kick');
      }
    }
  }

  f.vy += 0.8; f.y += f.vy;
  if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; }
  f.x += f.vx;
  f.x = Math.max(40, Math.min(W - 40, f.x));
}

// Shared damage rules for melee and projectiles
function landHit(a, d, dmg, stun, vx, airborne) {
  if (d.state === 'block' && !airborne) {
    dmg *= 0.25; d.stun = 8;
  } else {
    d.stun = stun; d.vx = vx;
  }
  d.hp = Math.max(0, d.hp - dmg);
  d.state = 'hit';
  d.flash = 10;
  d.meter = Math.min(SPECIAL_COST, d.meter + dmg * 0.8);
  a.meter = Math.min(SPECIAL_COST, a.meter + dmg * 1.5);
}

function checkHits(a, d) {
  if (a.state !== 'attack' || a.hitDone) return;
  const m = a.move;
  if (m.cast) return;
  if (a.t < m.startup || a.t >= m.startup + m.active) return;

  const w = HAND_MOVES.has(a.moveName) ? a.weapon : NO_WEAPON;
  const reach = m.range + w.reach;
  const x1 = a.facing > 0 ? a.x + 20 : a.x - 20 - reach;
  const x2 = x1 + reach;
  if (d.x + 22 < x1 || d.x - 22 > x2) return;

  const airborne = d.y < GROUND - 45;
  if (airborne && !m.hitsAir) return;

  a.hitDone = true;
  a.combo = a.comboT > 0 ? a.combo + 1 : 1;
  a.comboT = 40;
  const comboMult = Math.min(1.5, 1 + 0.1 * (a.combo - 1));
  const dmg = m.dmg * a.char.power * comboMult * w.dmg;
  landHit(a, d, dmg, m.stun, a.facing * m.knock, airborne);
}

// When a special's cast frame arrives, release its projectile once
function spawnCasts(gs) {
  for (const [f, opp] of [[gs.p1, gs.p2], [gs.p2, gs.p1]]) {
    if (f.state === 'attack' && f.moveName === 'special' && !f.cast && f.t >= f.move.startup) {
      f.cast = true;
      const k = PROJ[f.kind];
      gs.proj.push({
        x: f.x + f.facing * 45, y: k.y, vx: f.facing * k.speed,
        dmg: k.dmg * f.char.power, life: k.life, w: k.w,
        kind: f.kind, owner: f, target: opp,
      });
    }
  }
}

function updateProjectiles(gs) {
  gs.proj = gs.proj.filter((p) => {
    p.x += p.vx;
    p.life--;
    const d = p.target;
    // Hit if the projectile's height is inside the target's body
    if (d.hp > 0 && Math.abs(p.x - d.x) < p.w / 2 + 22 && p.y <= d.y && p.y >= d.y - 130) {
      landHit(p.owner, d, p.dmg, 16, p.owner.facing * 3, false);
      return false;
    }
    return p.life > 0 && p.x > -80 && p.x < W + 80;
  });
}

function resetFighters(gs) {
  [[gs.p1, 260, 1], [gs.p2, 700, -1]].forEach(([f, x, fc]) => {
    f.x = x; f.y = GROUND; f.vx = 0; f.vy = 0; f.hp = 100; f.meter = 0;
    f.state = 'idle'; f.stun = 0; f.move = null; f.moveName = null;
    f.facing = fc; f.hitDone = false; f.t = 0; f.total = 0; f.cast = false;
    f.combo = 0; f.comboT = 0; f.flash = 0;
  });
  gs.proj = [];
}

// cfg: { mode, p1Char, p1Weapon, p2Char, p2Weapon }
export function createMatch(cfg) {
  const single = cfg.mode === 'single';
  const p1 = makeFighter(CHARS[cfg.p1Char], 260, 1, false, P1K, 'P1', WEAPONS[cfg.p1Weapon]);
  const p2 = makeFighter(CHARS[cfg.p2Char], 700, -1, single, P2K, single ? 'CPU' : 'P2', WEAPONS[cfg.p2Weapon]);
  const gs = {
    p1, p2, proj: [], wins: [0, 0], round: 1,
    phase: 'intro', phaseT: 90, timeLeft: 3600,
    resultText: '', matchWinner: -1, done: false, endT: 0,
  };
  p1.kind = cfg.p1Special || p1.kind;
  p2.kind = cfg.p2Special || p2.kind;
  resetFighters(gs);
  return gs;
}

function endRound(gs, w, txt) {
  if (w >= 0) gs.wins[w]++;
  gs.resultText = txt; gs.phase = 'ko'; gs.phaseT = 150;
  gs.proj = [];
}

// Advance the match by one frame.
export function stepMatch(gs) {
  if (gs.done) return;
  const { p1, p2 } = gs;

  if (gs.phase === 'intro') { if (--gs.phaseT <= 0) gs.phase = 'play'; return; }

  if (gs.phase === 'play') {
    gs.timeLeft--;
    updateFighter(p1, p2); updateFighter(p2, p1);
    spawnCasts(gs);
    checkHits(p1, p2); checkHits(p2, p1);
    updateProjectiles(gs);
    if (p1.hp <= 0 || p2.hp <= 0) {
      const w = (p1.hp <= 0 && p2.hp <= 0) ? -1 : (p1.hp <= 0 ? 1 : 0);
      endRound(gs, w, w < 0 ? 'DOUBLE K.O.' : 'K.O.!');
    } else if (gs.timeLeft <= 0) {
      const w = p1.hp === p2.hp ? -1 : (p1.hp > p2.hp ? 0 : 1);
      endRound(gs, w, w < 0 ? 'TIME UP - DRAW' : 'TIME UP!');
    }
    return;
  }

  if (gs.phase === 'ko' && --gs.phaseT <= 0) {
    if (gs.wins[0] >= 2 || gs.wins[1] >= 2) {        // best of three
      gs.matchWinner = gs.wins[0] >= 2 ? 0 : 1;
      gs.done = true;
    } else {
      gs.round++; resetFighters(gs); gs.timeLeft = 3600;
      gs.phase = 'intro'; gs.phaseT = 90;
    }
  }
}