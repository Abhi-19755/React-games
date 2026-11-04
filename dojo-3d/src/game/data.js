// All tunable game numbers live here.
export const W = 960;
export const H = 540;
export const GROUND = 430;

// Maximum Health Pool: 250 HP prevents fast life draining and allows tactical fights
export const MAX_HP = 250;

// Shortened Special Bar: only 35 meter required (charges fast for aggressive combat!)
export const SPECIAL_COST = 35;

export const SPECIAL_NAMES = { blades: 'Ninja Blades', fire: 'Fire Blast', water: 'Water Wave', wind: 'Wind Slash', lightning: 'Lightning Strike', earth: 'Earth Crush', shadow: 'Shadow Strike', thunder: 'Thunder Clap' };

// Each character is a chibi fighter with unique gi colours, accessories and body scale.
export const CHARS = [
  { name: 'Karate',    gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'spiky',   special: 'blades', speed: 4.8, power: 1.05, desc: 'Ninja blades: spinning shuriken' },
  { name: 'Taekwondo', gi: '#ffffff', pants: '#ffffff', belt: '#111111', accent: '#d7141a', hair: 'bob',     special: 'water',  speed: 5.8, power: 0.95, desc: 'Water wave: low crashing wave' },
  { name: 'Muay Thai', gi: '#ffffff', pants: '#ffffff', belt: '#d4a017', accent: '#d7141a', hair: 'topknot', special: 'fire',   speed: 4.2, power: 1.25, desc: 'Fire blast: heavy flaming ball' },
  { name: 'Kung Fu',   gi: '#1a1a1a', pants: '#1a1a1a', belt: '#b01010', accent: '#ff4444', hair: 'ponytail', special: 'wind',  speed: 5.0, power: 1.10, desc: 'Wind slash: sweeping gust blade', accessories: ['scarf'] },
  { name: 'Capoeira',  gi: '#e8c820', pants: '#ffffff', belt: '#1a8a2a', accent: '#1a8a2a', hair: 'mohawk',   special: 'lightning', speed: 6.2, power: 0.88, desc: 'Lightning strike: fast bolt', accessories: ['anklets'] },
  { name: 'Krav Maga', gi: '#3a4a2a', pants: '#3a4a2a', belt: '#111111', accent: '#8a8a6a', hair: 'buzzcut',  special: 'earth', speed: 3.8, power: 1.35, desc: 'Earth crush: heavy ground slam', accessories: ['dogTags', 'armWraps'] },
  { name: 'Sumo',      gi: '#f9d4a8', pants: '#f9d4a8', belt: '#c9a13b', accent: '#c9a13b', hair: 'topknot', special: 'thunder', speed: 3.2, power: 1.55, desc: 'Thunder clap: shockwave stomp', accessories: ['belly', 'thickLegs'], bodyScale: 1.35 },
  { name: 'Ninjutsu',  gi: '#0a0a0a', pants: '#0a0a0a', belt: '#1a1a1a', accent: '#6a2a8a', hair: 'ponytail', special: 'shadow', speed: 6.0, power: 0.92, desc: 'Shadow strike: phantom dash', accessories: ['mask', 'hood', 'shoulderArmor'] },
];

// reach/dmg/slow modify hand moves only. type controls how the weapon is drawn.
export const WEAPONS = [
  { name: 'Fists',    type: null,    len: 0,  reach: 0,  dmg: 1.00, slow: 0, desc: 'Bare hands, fastest' },
  { name: 'Knife',    type: 'knife', len: 24, reach: 15, dmg: 1.15, slow: 0, desc: 'Short blade, quick cuts' },
  { name: 'Staff',    type: 'staff', len: 64, reach: 35, dmg: 1.25, slow: 2, desc: 'Long reach, crushing swings' },
  { name: 'Nunchaku', type: 'nun',   len: 30, reach: 20, dmg: 1.35, slow: 3, desc: 'Heavy rapid strikes' },
  { name: 'Katana',   type: 'sword', len: 82, reach: 50, dmg: 1.50, slow: 4, desc: 'Longest reach, lethal criticals' },
];

export const HAND_MOVES = new Set(['jab', 'hook', 'uppercut', 'smash', 'dash_strike', 'dive_punch']);

// Balanced damage values for 250 HP: smooth, satisfying life drain without instant KOs
export const MOVES = {
  jab:         { startup: 2,  active: 3, recovery: 6,  dmg: 7,  range: 48, stun: 9,  knock: 2, lunge: 3,  critBonus: 0.05 },
  hook:        { startup: 5,  active: 4, recovery: 9,  dmg: 12, range: 58, stun: 14, knock: 4, lunge: 4,  critBonus: 0.12 },
  kick:        { startup: 6,  active: 5, recovery: 11, dmg: 15, range: 82, stun: 18, knock: 6, lunge: 2,  critBonus: 0.15 },
  uppercut:    { startup: 6,  active: 4, recovery: 13, dmg: 18, range: 50, stun: 24, knock: 8, lunge: 2,  hitsAir: true, critBonus: 0.20 },
  sweep:       { startup: 8,  active: 5, recovery: 14, dmg: 13, range: 86, stun: 26, knock: 4, lunge: 3,  critBonus: 0.10 },
  jump_kick:   { startup: 4,  active: 12, recovery: 6, dmg: 16, range: 76, stun: 20, knock: 6, air: true, critBonus: 0.18 },
  dive_punch:  { startup: 4,  active: 10, recovery: 8, dmg: 17, range: 68, stun: 22, knock: 7, air: true, critBonus: 0.22 },
  dash_strike: { startup: 4,  active: 5, recovery: 10, dmg: 19, range: 72, stun: 22, knock: 7, lunge: 7,  critBonus: 0.25 },
  smash:       { startup: 9,  active: 5, recovery: 15, dmg: 25, range: 62, stun: 30, knock: 9, lunge: 4,  critBonus: 0.30 },
  // Special is a cast: it throws a projectile instead of a melee hitbox.
  special:     { startup: 10, active: 1, recovery: 14, dmg: 0,  range: 0,  stun: 0,  knock: 0, cost: SPECIAL_COST, cast: true },
};

export const P1K = { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', block: 'KeyL', jab: 'KeyJ', kick: 'KeyK', hook: 'KeyU', heavy: 'KeyI', special: 'KeyE' };
export const P2K = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', block: 'Numpad0', jab: 'Numpad1', kick: 'Numpad2', hook: 'Numpad3', heavy: 'Numpad4', special: 'Numpad5' };

// Special powers chosen on the Special Power screen
export const SPECIALS = [
  { id: 'blades',    name: 'Ninja Blades',    color: '#c9d6e3', desc: 'Spinning shuriken' },
  { id: 'fire',      name: 'Fire Blast',      color: '#ff6a1a', desc: 'Flaming ball of fire' },
  { id: 'water',     name: 'Water Wave',      color: '#4fc3f7', desc: 'Low crashing wave' },
  { id: 'wind',      name: 'Wind Slash',      color: '#88ddaa', desc: 'Sweeping gust blade' },
  { id: 'lightning', name: 'Lightning Strike', color: '#ffee44', desc: 'Fast crackling bolt' },
  { id: 'earth',     name: 'Earth Crush',     color: '#8a6a3a', desc: 'Heavy ground slam' },
  { id: 'thunder',   name: 'Thunder Clap',    color: '#aaddff', desc: 'Shockwave stomp' },
  { id: 'shadow',    name: 'Shadow Strike',   color: '#6a2a8a', desc: 'Phantom dash attack' },
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
];