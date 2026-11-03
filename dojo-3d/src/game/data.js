// All tunable game numbers live here.
export const W = 960;
export const H = 540;
export const GROUND = 430;

// Special bar: fills from hits. When full, press E to unleash the special power.
export const SPECIAL_COST = 100;

export const SPECIALS = [
  { id: 'blades', name: 'Ninja Blades', desc: 'Three spinning shuriken blades', color: '#e8eef5', projectile: 'blades' },
  { id: 'fire', name: 'Fire Blast', desc: 'Heavy flaming projectile', color: '#ff5a1a', projectile: 'fire' },
  { id: 'water', name: 'Water Wave', desc: 'Low crashing crescent wave', color: '#4fc3f7', projectile: 'water' },
  { id: 'lightning', name: 'Lightning Bolt', desc: 'Fast piercing electric arc', color: '#fff050', projectile: 'lightning' },
  { id: 'earth', name: 'Earth Shatter', desc: 'Ground-traveling rock spike', color: '#c9a86c', projectile: 'earth' },
];

// Each character is a white-gi chibi fighter like the reference art.
export const CHARS = [
  { name: 'Karate',    gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'spiky',   speed: 4.0, power: 1.00, desc: 'Balanced fighter, good at everything' },
  { name: 'Taekwondo', gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'bob',     speed: 5.0, power: 0.90, desc: 'Fast kicks, high mobility' },
  { name: 'Muay Thai', gi: '#ffffff', pants: '#ffffff', belt: '#d4a017', accent: '#d7141a', hair: 'topknot', speed: 3.5, power: 1.20, desc: 'Heavy hitter, slower but strong' },
  { name: 'Aria',      gi: '#f4d8e8', pants: '#f4d8e8', belt: '#e74c3c', accent: '#c0392b', hair: 'ponytail',speed: 4.4, power: 0.95, desc: 'Swift dancer, quick dashes' },
  { name: 'Kazuki',    gi: '#1a2a4a', pants: '#1a2a4a', belt: '#b8c8d8', accent: '#8a9ab8', hair: 'mohawk',  speed: 3.8, power: 1.15, desc: 'Silent lightning, heavy hits' },
];

// reach/dmg/slow modify hand moves only. type controls how the weapon is drawn.
export const WEAPONS = [
  { name: 'Fists',    type: null,    len: 0,  reach: 0,  dmg: 1.00, slow: 0, desc: 'Bare hands, fastest' },
  { name: 'Knife',    type: 'knife', len: 24, reach: 15, dmg: 1.10, slow: 0, desc: 'Short blade, quick cuts' },
  { name: 'Staff',    type: 'staff', len: 64, reach: 35, dmg: 1.20, slow: 3, desc: 'Long reach, slower' },
  { name: 'Nunchaku', type: 'nun',   len: 30, reach: 20, dmg: 1.30, slow: 4, desc: 'Heavy swings' },
  { name: 'Katana',   type: 'sword', len: 82, reach: 50, dmg: 1.45, slow: 6, desc: 'Longest reach, big damage' },
  { name: 'Tonfa',    type: 'tonfa', len: 36, reach: 22, dmg: 1.28, slow: 3, desc: 'Triangular handle, three short prongs' },
];

export const HAND_MOVES = new Set(['jab', 'hook', 'uppercut']);

// startup -> active (hitbox out) -> recovery, in frames at 60 fps.
// lunge = forward step speed during the active frames.
export const MOVES = {
  jab:       { startup: 3,  active: 3, recovery: 8,  dmg: 5,  range: 45, stun: 10, knock: 2, lunge: 2 },
  hook:      { startup: 6,  active: 4, recovery: 10, dmg: 9,  range: 55, stun: 14, knock: 4, lunge: 3 },
  kick:      { startup: 7,  active: 5, recovery: 12, dmg: 11, range: 78, stun: 18, knock: 5 },
  uppercut:  { startup: 7,  active: 4, recovery: 14, dmg: 13, range: 45, stun: 22, knock: 6, hitsAir: true },
  sweep:     { startup: 9,  active: 5, recovery: 16, dmg: 8,  range: 75, stun: 22, knock: 3 },
  jump_kick: { startup: 5,  active: 12, recovery: 6, dmg: 12, range: 70, stun: 20, knock: 5, air: true },
  // Roll/dodge: quick evasive movement with brief invincibility
  roll:      { startup: 2,  active: 10, recovery: 6, dmg: 0, range: 0, stun: 0, knock: 0, evade: true, invuln: 8 },
  // Special is a cast: it throws a projectile instead of a melee hitbox.
  special:   { startup: 14, active: 1, recovery: 20, dmg: 0, range: 0, stun: 0, knock: 0, cost: SPECIAL_COST, cast: true },
};

export const P1K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', block: 'KeyL', jab: 'KeyJ', kick: 'KeyK', hook: 'KeyU', special: 'KeyE', roll: 'KeyQ' };
export const P2K = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', block: 'Numpad0', jab: 'Numpad1', kick: 'Numpad2', hook: 'Numpad3', special: 'Numpad5', roll: 'Numpad7' };

// Environments/Stages
export const ENVIRONMENTS = [
  { id: 'dojo', name: 'Traditional Dojo', desc: 'Classic wooden dojo with banner', bgColor: '#2a0a10', fogColor: '#2a0a10' },
  { id: 'temple', name: 'Mountain Temple', desc: 'Misty temple at sunset', bgColor: '#1a102a', fogColor: '#2a1a3a' },
  { id: 'courtyard', name: 'Palace Courtyard', desc: 'Open courtyard under moonlight', bgColor: '#0a1a2a', fogColor: '#1a2a3a' },
  { id: 'volcano', name: 'Volcanic Arena', desc: 'Lava flows and ash', bgColor: '#2a0a05', fogColor: '#3a1a0a' },
  { id: 'forest', name: 'Bamboo Forest', desc: 'Peaceful bamboo grove', bgColor: '#0a2a0a', fogColor: '#1a3a1a' },
  { id: 'rooftop', name: 'City Rooftop', desc: 'Neon-lit city at night', bgColor: '#0a0a2a', fogColor: '#1a1a3a' },
  { id: 'desert', name: 'Desert Shrine', desc: 'Sandstone shrine under the sun', bgColor: '#3a2810', fogColor: '#5a4020' },
  { id: 'skygarden', name: 'Sky Garden', desc: 'Floating islands and cherry blossoms', bgColor: '#5a6a8a', fogColor: '#7a8aaa' },
  { id: 'canyon', name: 'Canyon Arena', desc: 'Rock walls and dusty canyon floor', bgColor: '#2a1208', fogColor: '#4a2810' },
  { id: 'crystal', name: 'Crystal Cave', desc: 'Glowing geodes and sparking crystals', bgColor: '#1a0a2a', fogColor: '#2a1a3a' },
];

// Special projectile configs
export const PROJ_CONFIG = {
  blades:  { speed: 12,  dmg: 16, life: 70,  y: GROUND - 100, w: 40,  color: '#e8eef5', trailColor: '#3a4a60', count: 3 },
  fire:    { speed: 8,   dmg: 20, life: 100, y: GROUND - 70,  w: 36, color: '#ff5a1a', trailColor: '#ff3a00', count: 1 },
  water:   { speed: 6.5, dmg: 14, life: 130, y: GROUND - 40,  w: 70, color: '#4fc3f7', trailColor: '#0a6fa8', count: 1 },
  lightning: { speed: 18, dmg: 18, life: 50,  y: GROUND - 80, w: 25, color: '#fff050', trailColor: '#ffaa00', count: 1 },
  earth:   { speed: 5,   dmg: 22, life: 120, y: GROUND - 10,  w: 50, color: '#c9a86c', trailColor: '#8b7355', count: 1 },
};