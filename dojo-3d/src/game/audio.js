// Sound effects are generated with the Web Audio API, so they need no files.
// Music is played from MP3 files in public/audio/ (see the file names below).
import { SPECIAL_COST } from './data.js';

// Put these files in public/audio/. Missing files are simply skipped.
//   menu.mp3, battle.mp3, entry-karate.mp3, entry-taekwondo.mp3, entry-muaythai.mp3
export const MUSIC = { menu: '/audio/menu.mp3', battle: '/audio/battle.mp3' };
// Entry song for a fighter, e.g. "Muay Thai" -> /audio/entry-muaythai.mp3
export const entrySongFor = (name) => `/audio/entry-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp3`;

const SFX_VOLUME = 0.7;
const MUSIC_VOLUME = 0.5;

let ctx = null, master = null, noise = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = SFX_VOLUME;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Browsers only allow sound after the user does something, so unlock on the first key or click
window.addEventListener('keydown', ensure);
window.addEventListener('pointerdown', ensure);

function envelope(g, t, attack, decay, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone({ freq, freq2 = freq, type = 'sine', dur = 0.2, vol = 0.5, at = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq2, t + dur);
  envelope(g, t, 0.005, dur, vol);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function burst({ dur = 0.15, from = 2000, to = 300, q = 1, type = 'bandpass', vol = 0.5, at = 0 }) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(to, 20), t + dur);
  const g = c.createGain();
  envelope(g, t, 0.003, dur, vol);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

const SFX = {
  swing: () => burst({ dur: 0.18, from: 2500, to: 400, q: 0.8, vol: 0.35 }),
  punch: () => { tone({ freq: 160, freq2: 60, dur: 0.18, vol: 0.7 }); burst({ dur: 0.08, from: 3000, to: 800, vol: 0.4 }); },
  kick: () => { burst({ dur: 0.25, from: 1200, to: 200, vol: 0.4 }); tone({ freq: 110, freq2: 45, dur: 0.22, vol: 0.6 }); },
  heavy: () => { tone({ freq: 120, freq2: 40, dur: 0.3, vol: 0.9 }); burst({ dur: 0.12, from: 1500, to: 300, vol: 0.5 }); },
  crit: () => {
    tone({ freq: 240, freq2: 45, dur: 0.35, vol: 1.0 });
    burst({ dur: 0.22, from: 4500, to: 200, q: 1.2, vol: 0.7 });
    tone({ freq: 750, freq2: 1200, type: 'triangle', dur: 0.15, vol: 0.4, at: 0.04 });
  },
  block: () => { tone({ freq: 1800, freq2: 900, type: 'square', dur: 0.08, vol: 0.2 }); burst({ dur: 0.05, from: 5000, to: 2000, vol: 0.3 }); },
  fire: () => burst({ dur: 0.6, from: 400, to: 1800, q: 0.6, vol: 0.4 }),
  water: () => burst({ dur: 0.7, from: 600, to: 200, q: 2, vol: 0.45 }),
  blades: () => burst({ dur: 0.35, from: 6000, to: 2500, q: 3, vol: 0.35 }),
  wind: () => { burst({ dur: 0.45, from: 3000, to: 800, q: 1.5, vol: 0.35 }); tone({ freq: 600, freq2: 300, type: 'sine', dur: 0.35, vol: 0.2 }); },
  lightning: () => { tone({ freq: 2200, freq2: 120, type: 'sawtooth', dur: 0.15, vol: 0.5 }); burst({ dur: 0.18, from: 7500, to: 1000, q: 0.5, vol: 0.45 }); },
  earth: () => { tone({ freq: 85, freq2: 30, dur: 0.45, vol: 0.7 }); burst({ dur: 0.35, from: 600, to: 120, q: 0.8, vol: 0.45 }); },
  thunder: () => { tone({ freq: 160, freq2: 40, dur: 0.5, vol: 0.8 }); burst({ dur: 0.45, from: 1200, to: 200, q: 0.6, vol: 0.5 }); },
  shadow: () => { burst({ dur: 0.3, from: 4000, to: 1500, q: 3, vol: 0.35 }); tone({ freq: 450, freq2: 180, type: 'sine', dur: 0.25, vol: 0.25 }); },
  ready: () => {
    tone({ freq: 660, freq2: 880, type: 'triangle', dur: 0.12, vol: 0.3 });
    tone({ freq: 990, freq2: 1320, type: 'triangle', dur: 0.15, vol: 0.3, at: 0.1 });
  },
  round: () => {
    tone({ freq: 440, type: 'triangle', dur: 0.5, vol: 0.35 });
    tone({ freq: 660, type: 'triangle', dur: 0.5, vol: 0.25, at: 0.15 });
  },
  fight: () => tone({ freq: 880, type: 'sawtooth', dur: 0.25, vol: 0.3 }),
  ko: () => tone({ freq: 300, freq2: 50, type: 'sawtooth', dur: 1.2, vol: 0.4 }),
  select: () => tone({ freq: 520, freq2: 620, type: 'triangle', dur: 0.06, vol: 0.2 }),
  confirm: () => tone({ freq: 700, freq2: 1000, type: 'triangle', dur: 0.1, vol: 0.25 }),
};

// Play a named sound effect ('punch', 'fire', 'select', ...)
export function sfx(name) {
  try { SFX[name]?.(); } catch { /* sound is optional */ }
}

// ---------- music ----------

let music = null;
let musicSrc = null;

export function playMusic(src, { loop = true } = {}) {
  if (src === musicSrc) return;
  stopMusic();
  if (!src) return;
  const a = new Audio(src);
  a.loop = loop;
  a.volume = MUSIC_VOLUME;
  a.play().catch(() => { /* missing file or blocked: stay silent */ });
  music = a;
  musicSrc = src;
}

export function stopMusic() {
  if (music) music.pause();
  music = null;
  musicSrc = null;
}

// ---------- in-fight sounds ----------

const HEAVY = new Set(['kick', 'sweep', 'jump_kick', 'special', 'smash', 'dash_strike', 'dive_punch']);

// Called every frame from the arena. Plays sounds for whatever just happened
// and returns a snapshot to compare against next frame.
export function matchSounds(gs, prev) {
  const p = prev || { phase: null, f: [] };

  if (!prev) playMusic(entrySongFor(gs.p1.char.name), { loop: false });  // entry song for the intro
  if (gs.phase !== p.phase) {
    if (gs.phase === 'intro') sfx('round');
    if (gs.phase === 'play') { sfx('fight'); playMusic(MUSIC.battle); }
    if (gs.phase === 'ko') sfx('ko');
  }

  const fighters = [gs.p1, gs.p2];
  const snap = { phase: gs.phase, f: [] };
  fighters.forEach((f, i) => {
    const q = p.f[i] || {};
    const attacker = fighters[1 - i];

    if (f.state === 'attack' && f.move && f.moveName !== q.moveName && f.moveName !== 'special') {
      sfx(HEAVY.has(f.moveName) ? 'kick' : 'swing');
    }
    if (f.cast && !q.cast) sfx(f.kind);                       // special released: fire / water / blades
    if (f.critFlash === 16 && q.critFlash !== 16) {
      sfx('crit');
    } else if (f.flash === 10 && q.flash !== 10) {                    // this fighter was hit
      if (q.state === 'block') sfx('block');
      else sfx(HEAVY.has(attacker.moveName) ? 'heavy' : 'punch');
    }
    if (f.meter >= SPECIAL_COST && (q.meter ?? 0) < SPECIAL_COST) sfx('ready');

    snap.f.push({ moveName: f.moveName, state: f.state, cast: f.cast, flash: f.flash, critFlash: f.critFlash, meter: f.meter });
  });
  return snap;
}