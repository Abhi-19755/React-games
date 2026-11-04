import { CHARS, WEAPONS, MOVES, HAND_MOVES, P1K, P2K, GROUND, W, SPECIAL_COST, MAX_HP } from './data.js';
import { readInput } from './input.js';

const NO_WEAPON = WEAPONS[0];

// Special projectiles: speed (px/frame), damage (scaled for MAX_HP 250), lifetime, screen height, hit width
export const PROJ = {
  blades:    { speed: 12,  dmg: 30, life: 70,  y: GROUND - 100, w: 40 },
  fire:      { speed: 8,   dmg: 36, life: 100, y: GROUND - 70,  w: 36 },
  water:     { speed: 6.5, dmg: 28, life: 130, y: GROUND - 40,  w: 70 },
  wind:      { speed: 14,  dmg: 28, life: 60,  y: GROUND - 90,  w: 55 },
  lightning: { speed: 18,  dmg: 34, life: 45,  y: GROUND - 110, w: 30 },
  earth:     { speed: 5,   dmg: 38, life: 120, y: GROUND - 50,  w: 50 },
  thunder:   { speed: 7,   dmg: 40, life: 90,  y: GROUND - 60,  w: 65 },
  shadow:    { speed: 16,  dmg: 32, life: 55,  y: GROUND - 100, w: 35 },
};

export function makeFighter(char, x, facing, isAI, keys, label, weapon = NO_WEAPON) {
  return {
    char, label, isAI, keys, weapon,
    kind: char.special || 'blades',     // which special power this fighter has
    x, facing, y: GROUND, vx: 0, vy: 0,
    hp: MAX_HP, maxHp: MAX_HP, meter: 0, state: 'idle', stun: 0,
    t: 0, total: 0, move: null, moveName: null, hitDone: false, cast: false,
    combo: 0, comboT: 0, aiCool: 0, aiBlock: 0,
    flash: 0, critFlash: 0, isCrit: false, critTimer: 0,
    specialBuffer: 0,
  };
}

function startMove(f, name) {
  const m = MOVES[name];
  if (!m) return;
  f.state = 'attack'; f.move = m; f.moveName = name;
  f.t = 0; f.hitDone = false; f.cast = false;
  // Total length of this move in frames; hand moves are slowed by the weapon
  f.total = m.startup + m.active + m.recovery + (HAND_MOVES.has(name) ? f.weapon.slow : 0);
  if (m.cost) f.meter = Math.max(0, f.meter - m.cost);
  if (name === 'jump_kick') f.vx = f.facing * 5.5;
  if (name === 'dive_punch') { f.vx = f.facing * 5; f.vy = 8; }
  if (name === 'dash_strike') f.vx = f.facing * 7.5;
}

function endMove(f) {
  f.state = 'idle'; f.move = null; f.moveName = null;
}

function aiInput(f, opp) {
  const r = { left: false, right: false, up: false, down: false, block: false,
              jab: false, kick: false, hook: false, heavy: false, special: false };
  const d = opp.x - f.x, dist = Math.abs(d);
  const fwd = d > 0 ? 'right' : 'left', back = d > 0 ? 'left' : 'right';
  f.aiCool = Math.max(0, f.aiCool - 1);

  // Aggressive relentless pursuit
  if (dist > 95) {
    r[fwd] = true;
    if (dist > 180 && Math.random() < 0.05) r.up = true;
  } else if (dist < 45 && Math.random() < 0.12) {
    r[back] = true;
  }

  // Fast tactical reaction block
  if (opp.state === 'attack' && dist < 125 && Math.random() < 0.45) {
    f.aiBlock = 8;
  }
  if (f.aiBlock > 0) { r.block = true; f.aiBlock--; }

  // Fire special as soon as short meter (40) is filled!
  if (f.meter >= SPECIAL_COST && f.state !== 'attack' && f.aiCool === 0 && Math.random() < 0.25) {
    r.special = true; f.aiCool = 16;
  }

  // Aggressive combat attack selection
  if (f.aiCool === 0 && f.state !== 'attack') {
    if (dist < 80 && Math.random() < 0.26) {
      f.aiCool = 10;
      const roll = Math.random();
      if (roll < 0.22) r.jab = true;                           // lightning jab
      else if (roll < 0.42) r.hook = true;                      // hook
      else if (roll < 0.58) r.kick = true;                      // kick
      else if (roll < 0.72) { r.down = true; r.jab = true; }    // uppercut
      else if (roll < 0.86) { r.down = true; r.hook = true; }   // heavy smash!
      else { r.down = true; r.kick = true; }                    // low sweep
    } else if (dist >= 80 && dist < 170 && Math.random() < 0.22) {
      f.aiCool = 12;
      const roll = Math.random();
      if (roll < 0.50) { r[fwd] = true; r.hook = true; }         // forward dash strike!
      else if (roll < 0.78) r.kick = true;                      // long kick
      else { r.up = true; r.kick = true; }                      // jumping flying kick!
    }
  }

  // Mid-air attacks
  if (f.y < GROUND - 2 && Math.random() < 0.28) {
    if (Math.random() < 0.5) r.kick = true;                     // flying jump kick
    else r.jab = true;                                          // dive punch
  }

  return r;
}

function updateFighter(f, opp) {
  const c = f.char, grounded = f.y >= GROUND;
  const inp = f.remoteInput ? f.remoteInput : (f.isAI ? aiInput(f, opp) : readInput(f.keys));
  f.facing = opp.x >= f.x ? 1 : -1;
  if (f.comboT > 0) f.comboT--; else f.combo = 0;
  if (f.flash > 0) f.flash--;
  if (f.critFlash > 0) f.critFlash--;
  if (f.critTimer > 0) f.critTimer--; else f.isCrit = false;

  // Buffer special move input so tapping E even during an attack/stun will unleash it!
  if (inp.special) f.specialBuffer = 20;
  if (f.specialBuffer > 0) f.specialBuffer--;

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
      const wantSpecial = (inp.special || f.specialBuffer > 0) && f.meter >= SPECIAL_COST;
      if (wantSpecial) {
        startMove(f, 'special');
        f.specialBuffer = 0;
      } else if (grounded) {
        if (inp.up) f.vy = -14.5;
        else if (inp.heavy || (inp.down && inp.hook)) startMove(f, 'smash');
        else if ((inp.left || inp.right) && inp.hook) startMove(f, 'dash_strike');
        else if (inp.jab && inp.down) startMove(f, 'uppercut');
        else if (inp.kick && inp.down) startMove(f, 'sweep');
        else if (inp.jab) startMove(f, 'jab');
        else if (inp.hook) startMove(f, 'hook');
        else if (inp.kick) startMove(f, 'kick');
      } else {
        if (inp.kick) startMove(f, 'jump_kick');
        else if (inp.jab || inp.heavy) startMove(f, 'dive_punch');
      }
    }
  }

  f.vy += 0.85; f.y += f.vy;
  if (f.y >= GROUND) { f.y = GROUND; f.vy = 0; }
  f.x += f.vx;
  f.x = Math.max(40, Math.min(W - 40, f.x));
}

// Shared damage rules for melee and projectiles with Critical Hit system
function landHit(a, d, dmg, stun, vx, airborne, isCrit = false, gs = null) {
  if (isCrit) {
    dmg = Math.round(dmg * 1.75);
    stun = Math.round(stun * 1.4);
    vx *= 1.45;
    d.critFlash = 16;
    a.isCrit = true;
    a.critTimer = 45;
    if (gs) {
      gs.lastHitCrit = true;
      gs.shake = 14;
    }
  }

  if (d.state === 'block' && !airborne) {
    dmg *= 0.25; d.stun = 8;
  } else {
    d.stun = stun; d.vx = vx;
  }
  d.hp = Math.max(0, d.hp - dmg);
  d.state = 'hit';
  d.flash = 10;
  // Special meter increases when fighting: landing hits and criticals
  const meterGain = isCrit ? 9 : 6;
  d.meter = Math.min(SPECIAL_COST, d.meter + 3);
  a.meter = Math.min(SPECIAL_COST, a.meter + meterGain);
}

function checkHits(a, d, gs) {
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
  a.comboT = 48;
  const comboMult = Math.min(1.6, 1 + 0.12 * (a.combo - 1));
  const dmg = m.dmg * a.char.power * comboMult * w.dmg;

  // Critical Hit Calculation:
  // Base 15% + move bonus (up to 30%) + counter-hit bonus (25% if opponent is attacking!)
  const isCounter = d.state === 'attack';
  const critChance = 0.15 + (m.critBonus || 0) + (isCounter ? 0.25 : 0);
  const isCrit = Math.random() < Math.min(0.70, critChance);

  landHit(a, d, dmg, m.stun, a.facing * m.knock, airborne, isCrit, gs);
}

// When a special's cast frame arrives, release its projectile once
function spawnCasts(gs) {
  for (const [f, opp] of [[gs.p1, gs.p2], [gs.p2, gs.p1]]) {
    if (f.state === 'attack' && f.moveName === 'special' && !f.cast && f.t >= f.move.startup) {
      f.cast = true;
      const k = PROJ[f.kind] || PROJ.blades;
      gs.proj.push({
        x: f.x + f.facing * 45, y: k.y, vx: f.facing * k.speed,
        dmg: k.dmg * f.char.power, life: k.life, w: k.w,
        kind: f.kind || 'blades', owner: f, target: opp,
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
      const isCrit = Math.random() < 0.25;
      landHit(p.owner, d, p.dmg, 16, p.owner.facing * 3.5, false, isCrit, gs);
      return false;
    }
    return p.life > 0 && p.x > -80 && p.x < W + 80;
  });
}

function resetFighters(gs) {
  [[gs.p1, 260, 1], [gs.p2, 700, -1]].forEach(([f, x, fc]) => {
    f.x = x; f.y = GROUND; f.vx = 0; f.vy = 0; f.hp = MAX_HP; f.maxHp = MAX_HP; f.meter = 0;
    f.state = 'idle'; f.stun = 0; f.move = null; f.moveName = null;
    f.facing = fc; f.hitDone = false; f.t = 0; f.total = 0; f.cast = false;
    f.combo = 0; f.comboT = 0; f.flash = 0; f.critFlash = 0; f.isCrit = false; f.critTimer = 0;
    f.specialBuffer = 0;
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
    shake: 0, lastHitCrit: false,
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
  if (gs.shake > 0) gs.shake--;
  gs.lastHitCrit = false;

  if (gs.phase === 'intro') { if (--gs.phaseT <= 0) gs.phase = 'play'; return; }

  if (gs.phase === 'play') {
    gs.timeLeft--;
    updateFighter(p1, p2); updateFighter(p2, p1);
    spawnCasts(gs);
    checkHits(p1, p2, gs); checkHits(p2, p1, gs);
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

// Serialize game state for real-time multiplayer network synchronization
export function packGameState(gs) {
  return {
    p1: {
      x: gs.p1.x, y: gs.p1.y, vx: gs.p1.vx, vy: gs.p1.vy,
      hp: gs.p1.hp, meter: gs.p1.meter, state: gs.p1.state,
      moveName: gs.p1.moveName, t: gs.p1.t, total: gs.p1.total, facing: gs.p1.facing,
      flash: gs.p1.flash, critFlash: gs.p1.critFlash,
      combo: gs.p1.combo, comboT: gs.p1.comboT,
      isCrit: gs.p1.isCrit,
    },
    p2: {
      x: gs.p2.x, y: gs.p2.y, vx: gs.p2.vx, vy: gs.p2.vy,
      hp: gs.p2.hp, meter: gs.p2.meter, state: gs.p2.state,
      moveName: gs.p2.moveName, t: gs.p2.t, total: gs.p2.total, facing: gs.p2.facing,
      flash: gs.p2.flash, critFlash: gs.p2.critFlash,
      combo: gs.p2.combo, comboT: gs.p2.comboT,
      isCrit: gs.p2.isCrit,
    },
    proj: gs.proj.map((p) => ({ x: p.x, y: p.y, vx: p.vx, kind: p.kind })),
    timeLeft: gs.timeLeft,
    round: gs.round,
    wins: gs.wins,
    phase: gs.phase,
    phaseT: gs.phaseT,
    resultText: gs.resultText,
    matchWinner: gs.matchWinner,
    done: gs.done,
    shake: gs.shake,
  };
}

// Apply network synchronized game state on guest client
export function unpackGameState(gs, data) {
  if (!gs || !data) return;
  if (data.p1) {
    Object.assign(gs.p1, data.p1);
    if (data.p1.moveName && MOVES[data.p1.moveName]) {
      gs.p1.move = MOVES[data.p1.moveName];
    } else if (!data.p1.moveName) {
      gs.p1.move = null;
    }
  }
  if (data.p2) {
    Object.assign(gs.p2, data.p2);
    if (data.p2.moveName && MOVES[data.p2.moveName]) {
      gs.p2.move = MOVES[data.p2.moveName];
    } else if (!data.p2.moveName) {
      gs.p2.move = null;
    }
  }
  if (data.proj) {
    gs.proj = data.proj;
  }
  if (data.timeLeft !== undefined) gs.timeLeft = data.timeLeft;
  if (data.round !== undefined) gs.round = data.round;
  if (data.wins !== undefined) gs.wins = data.wins;
  if (data.phase !== undefined) gs.phase = data.phase;
  if (data.phaseT !== undefined) gs.phaseT = data.phaseT;
  if (data.resultText !== undefined) gs.resultText = data.resultText;
  if (data.matchWinner !== undefined) gs.matchWinner = data.matchWinner;
  if (data.done !== undefined) gs.done = data.done;
  if (data.shake !== undefined) gs.shake = data.shake;
}