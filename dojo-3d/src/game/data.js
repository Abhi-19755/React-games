// All tunable game numbers live here.
export const W = 960;
export const H = 540;
export const GROUND = 430;

// Special bar: fills from hits. When full, press E to unleash the special power.
export const SPECIAL_COST = 100;

export const SPECIAL_NAMES = { blades: 'Ninja Blades', fire: 'Fire Blast', water: 'Water Wave' };

// Each character is a white-gi chibi fighter like the reference art.
export const CHARS = [
  { name: 'Karate',    gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'spiky',   special: 'blades', speed: 4.0, power: 1.00, desc: 'Ninja blades: spinning shuriken' },
  { name: 'Taekwondo', gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'bob',     special: 'water',  speed: 5.0, power: 0.90, desc: 'Water wave: low crashing wave' },
  { name: 'Muay Thai', gi: '#ffffff', pants: '#ffffff', belt: '#d4a017', accent: '#d7141a', hair: 'topknot', special: 'fire',   speed: 3.5, power: 1.20, desc: 'Fire blast: heavy flaming ball' },
];

// reach/dmg/slow modify hand moves only. type controls how the weapon is drawn.
export const WEAPONS = [
  { name: 'Fists',    type: null,    len: 0,  reach: 0,  dmg: 1.00, slow: 0, desc: 'Bare hands, fastest' },
  { name: 'Knife',    type: 'knife', len: 24, reach: 15, dmg: 1.10, slow: 0, desc: 'Short blade, quick cuts' },
  { name: 'Staff',    type: 'staff', len: 64, reach: 35, dmg: 1.20, slow: 3, desc: 'Long reach, slower' },
  { name: 'Nunchaku', type: 'nun',   len: 30, reach: 20, dmg: 1.30, slow: 4, desc: 'Heavy swings' },
  { name: 'Katana',   type: 'sword', len: 82, reach: 50, dmg: 1.45, slow: 6, desc: 'Longest reach, big damage' },
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
  // Special is a cast: it throws a projectile instead of a melee hitbox.
  special:   { startup: 14, active: 1, recovery: 20, dmg: 0, range: 0, stun: 0, knock: 0, cost: SPECIAL_COST, cast: true },
};

export const P1K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', block: 'KeyL', jab: 'KeyJ', kick: 'KeyK', hook: 'KeyU', special: 'KeyE' };
export const P2K = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', block: 'Numpad0', jab: 'Numpad1', kick: 'Numpad2', hook: 'Numpad3', special: 'Numpad5' };

// Special powers chosen on the Special Power screen
export const SPECIALS = [
  { id: 'blades', name: 'Ninja Blades', color: '#c9d6e3', desc: 'Spinning shuriken' },
  { id: 'fire',   name: 'Fire Blast',   color: '#ff6a1a', desc: 'Flaming ball of fire' },
  { id: 'water',  name: 'Water Wave',   color: '#4fc3f7', desc: 'Low crashing wave' },
];

// Arena themes chosen on the Environment screen. Each id matches a scene in Arena3D.jsx.
export const ENVIRONMENTS = [
  { id: 'dojo', name: 'Dojo', desc: 'Wooden training hall at dusk', bgColor: '#2a0a10', fogColor: '#2a0a10',
    theme: { floor: '#5a2a16', plank: '#2a1208', wall1: '#2a0a0e', wall2: '#3d1217', pillar: '#4a0f14', accent: '#c9a13b', lantern: '#ff9a3a' } },
  { id: 'volcano', name: 'Volcano Forge', desc: 'Lava pools and rising embers', bgColor: '#1a0600', fogColor: '#2a0c04',
    theme: { floor: '#3a1a0a', plank: '#2a0a05', wall1: '#5a1a0a', wall2: '#7a2a0a', pillar: '#5a2a0a', accent: '#ff6a00', lantern: '#ff4400' } },
  { id: 'forest', name: 'Bamboo Forest', desc: 'Green bamboo grove', bgColor: '#06140a', fogColor: '#0a2014',
    theme: { floor: '#1a3a1a', plank: '#0a2a0a', wall1: '#0a2a0a', wall2: '#1a3a1a', pillar: '#2a4a2a', accent: '#4a8a4a', lantern: '#66ff66' } },
  { id: 'temple', name: 'Moon Temple', desc: 'Violet shrine at night', bgColor: '#0c0616', fogColor: '#160a24',
    theme: { floor: '#2a1a2a', plank: '#1a0a1a', wall1: '#1a0a2a', wall2: '#2a1a3a', pillar: '#2a1a3a', accent: '#8a4a8a', lantern: '#ff66ff' } },
  { id: 'courtyard', name: 'Night Courtyard', desc: 'Moonlit garden courtyard', bgColor: '#0a1426', fogColor: '#0e1c34',
    theme: { floor: '#1a2a3a', plank: '#0e1a2a', wall1: '#0a1a3a', wall2: '#1a2a4a', pillar: '#1a2a4a', accent: '#4a6a8a', lantern: '#66aaff' } },
  { id: 'rooftop', name: 'Neon Rooftop', desc: 'City rooftop under neon signs', bgColor: '#06061a', fogColor: '#0c0c28',
    theme: { floor: '#1a1a3a', plank: '#0a0a1e', wall1: '#0a0a2a', wall2: '#1a1a4a', pillar: '#1a1a3a', accent: '#4a4a8a', lantern: '#ffff66' } },
  { id: 'desert', name: 'Desert Shrine', desc: 'Sandstone shrine with palms', bgColor: '#6a4a2a', fogColor: '#8a6a3a',
    theme: { floor: '#5a4020', plank: '#6a4a1a', wall1: '#6a4a20', wall2: '#8a6a30', pillar: '#6a4a20', accent: '#c9a13b', lantern: '#ffcc66' } },
  { id: 'skygarden', name: 'Sky Garden', desc: 'Floating platforms and cherry trees', bgColor: '#2a3a5a', fogColor: '#4a5a7a',
    theme: { floor: '#4a5a7a', plank: '#6a7a9a', wall1: '#4a5a7a', wall2: '#5a6a8a', pillar: '#8a7a6a', accent: '#ffc0d0', lantern: '#ffc0d0' } },
  { id: 'canyon', name: 'Canyon Arena', desc: 'Rock walls and dust', bgColor: '#3a2010', fogColor: '#5a3a20',
    theme: { floor: '#2a1408', plank: '#3a2010', wall1: '#5a3a1a', wall2: '#6a4a2a', pillar: '#5a3a1a', accent: '#c9a86c', lantern: '#ffaa66' } },
  { id: 'crystal', name: 'Crystal Cave', desc: 'Glowing geodes and sparkles', bgColor: '#0a0414', fogColor: '#1a0a2a',
    theme: { floor: '#1a0a2a', plank: '#2a1438', wall1: '#1a0a2a', wall2: '#2a1438', pillar: '#2a1438', accent: '#9a5ad8', lantern: '#9a6aff' } },
];