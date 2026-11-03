// Global keyboard state. Attached once when the module loads, so React
// StrictMode's double-mounting cannot add duplicate listeners.
const down = new Set();     // keys currently held
const pressed = new Set();  // keys pressed since the last endFrame()

const GAME_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyE', 'KeyQ',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7',
  'Space', 'Enter',
]);

window.addEventListener('keydown', (e) => {
  if (GAME_CODES.has(e.code)) e.preventDefault();
  if (!e.repeat) pressed.add(e.code);
  down.add(e.code);
});
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => down.clear());

export const isPressed = (code) => pressed.has(code);

// Turn a key map (e.g. P1K) into one frame's input object.
export function readInput(k) {
  return {
    left: down.has(k.left), right: down.has(k.right),
    up: pressed.has(k.up), down: down.has(k.down),
    block: down.has(k.block),
    jab: pressed.has(k.jab), kick: pressed.has(k.kick),
    hook: pressed.has(k.hook), special: pressed.has(k.special),
    roll: pressed.has(k.roll),
  };
}

// Call once per frame after reading input, so presses don't repeat.
export function endFrame() {
  pressed.clear();
}