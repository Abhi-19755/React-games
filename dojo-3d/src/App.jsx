import { useEffect, useRef, useState } from 'react';
import FightScreen from './FightScreen.jsx';
import { FighterPreview, WeaponPreview } from './Previews.jsx';
import { CHARS, WEAPONS, SPECIALS, ENVIRONMENTS } from './game/data.js';
import { isPressed, endFrame } from './game/input.js';
import { sfx, playMusic, MUSIC, entrySongFor } from './game/audio.js';
import { createMultiplayerSession, getActiveSession, closeActiveSession } from './game/multiplayer.js';

const INIT = {
  screen: 'menu',        // menu | mode | room | select | weapon | special | env | fight | result
  mode: 'single',        // single | multi
  isHost: true,          // true for host (P1), false for guest (P2)
  netRole: 'p1',         // 'p1' | 'p2'
  netStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected'
  sel: 0,                // keyboard focus in menu screens
  p1Idx: 0, p2Idx: 1, p1Lock: false, p2Lock: false,
  p1W: 0, p2W: 0, p1WLock: false, p2WLock: false,
  p1Special: 'blades', p2Special: 'blades', p1SpecialLock: false, p2SpecialLock: false,
  env: 'dojo', envLock: false,
  roomCode: '', fightCfg: null, result: null,
};

const MENU = {
  menu:   [{ label: 'Play', to: 'mode' }, { label: 'Character Selection', to: 'select', mode: 'single' }],
  mode:   [{ label: 'Single Player', to: 'select', mode: 'single' }, { label: 'Multiplayer', to: 'room', mode: 'multi' }, { label: 'Back', to: 'menu' }],
  result: [{ label: 'Rematch', fight: true }, { label: 'Main Menu', to: 'menu' }],
};
const BACK = { mode: 'menu', room: 'mode', result: 'menu' };
const selectBack = (u) => (u.mode === 'multi' ? 'room' : 'mode');

const randomRoom = () =>
  Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('');

function startFight(u) {
  const cpu = u.mode === 'single';
  return {
    ...u, screen: 'fight', result: null,
    fightCfg: {
      mode: u.mode,
      isHost: u.isHost,
      netRole: u.netRole,
      p1Char: u.p1Idx, p1Weapon: u.p1W, p1Special: u.p1Special,
      p2Char: cpu ? Math.floor(Math.random() * CHARS.length) : u.p2Idx,
      p2Weapon: cpu ? Math.floor(Math.random() * WEAPONS.length) : u.p2W,
      p2Special: cpu ? SPECIALS[Math.floor(Math.random() * SPECIALS.length)].id : u.p2Special,
      env: u.env,
    },
  };
}

function activate(u, item) {
  if (item.fight) {
    const next = startFight(u);
    if (u.mode === 'multi') {
      getActiveSession()?.send({ type: 'START_FIGHT', fightCfg: next.fightCfg });
    }
    return next;
  }
  if (item.to === 'room') return { ...u, screen: 'room', mode: 'multi', roomCode: randomRoom(), sel: 0 };
  if (item.to === 'select') return { ...u, screen: 'select', mode: item.mode ?? u.mode, p1Lock: false, p2Lock: false, sel: 0 };
  return { ...u, screen: item.to, mode: item.mode ?? u.mode, sel: 0 };
}

// Keyboard handling for every screen except the fight. Returns the same
// object when nothing changed, so React can skip the re-render.
function keyStep(u) {
  if (u.screen === 'room') {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return u;
    if (isPressed('Escape')) return { ...u, screen: 'mode', sel: 0 };
    return u;
  }

  if (MENU[u.screen]) {
    const items = MENU[u.screen], n = items.length;
    if (isPressed('KeyW') || isPressed('ArrowUp')) return { ...u, sel: (u.sel + n - 1) % n };
    if (isPressed('KeyS') || isPressed('ArrowDown')) return { ...u, sel: (u.sel + 1) % n };
    if (isPressed('Escape') && BACK[u.screen]) return { ...u, screen: BACK[u.screen], sel: 0 };
    if (isPressed('Enter') || isPressed('Space')) return activate(u, items[u.sel]);
    return u;
  }

  if (u.screen === 'select') {
    let r = u;
    const multi = u.mode === 'multi';
    const session = getActiveSession();

    if (multi) {
      if (u.netRole === 'p1' && !u.p1Lock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextIdx = (r.p1Idx + CHARS.length - 1) % CHARS.length;
          const nextSp = CHARS[nextIdx].special;
          r = { ...r, p1Idx: nextIdx, p1Special: nextSp };
          session?.send({ type: 'SYNC_SELECT', p1Idx: nextIdx, p1Lock: false, p1Special: nextSp });
        }
        if (isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextIdx = (r.p1Idx + 1) % CHARS.length;
          const nextSp = CHARS[nextIdx].special;
          r = { ...r, p1Idx: nextIdx, p1Special: nextSp };
          session?.send({ type: 'SYNC_SELECT', p1Idx: nextIdx, p1Lock: false, p1Special: nextSp });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p1Lock: true, p1Special: CHARS[r.p1Idx].special };
          session?.send({ type: 'SYNC_SELECT', p1Idx: r.p1Idx, p1Lock: true, p1Special: r.p1Special });
        }
      } else if (u.netRole === 'p2' && !u.p2Lock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextIdx = (r.p2Idx + CHARS.length - 1) % CHARS.length;
          const nextSp = CHARS[nextIdx].special;
          r = { ...r, p2Idx: nextIdx, p2Special: nextSp };
          session?.send({ type: 'SYNC_SELECT', p2Idx: nextIdx, p2Lock: false, p2Special: nextSp });
        }
        if (isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextIdx = (r.p2Idx + 1) % CHARS.length;
          const nextSp = CHARS[nextIdx].special;
          r = { ...r, p2Idx: nextIdx, p2Special: nextSp };
          session?.send({ type: 'SYNC_SELECT', p2Idx: nextIdx, p2Lock: false, p2Special: nextSp });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p2Lock: true, p2Special: CHARS[r.p2Idx].special };
          session?.send({ type: 'SYNC_SELECT', p2Idx: r.p2Idx, p2Lock: true, p2Special: r.p2Special });
        }
      }
    } else {
      if (!u.p1Lock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) r = { ...r, p1Idx: (r.p1Idx + CHARS.length - 1) % CHARS.length };
        if (isPressed('KeyD') || isPressed('ArrowRight')) r = { ...r, p1Idx: (r.p1Idx + 1) % CHARS.length };
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) r = { ...r, p1Lock: true, p1Special: CHARS[r.p1Idx].special };
      }
    }

    if (isPressed('Escape')) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: selectBack(u) });
      return { ...u, screen: selectBack(u), sel: 0 };
    }
    const ready = multi ? (r.p1Lock && r.p2Lock) : r.p1Lock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: 'weapon' });
      return { ...r, screen: 'weapon', p1WLock: false, p2WLock: false, sel: 0 };
    }
    return r;
  }

  if (u.screen === 'weapon') {
    let r = u;
    const multi = u.mode === 'multi', n = WEAPONS.length;
    const session = getActiveSession();

    if (multi) {
      if (u.netRole === 'p1' && !u.p1WLock) {
        if (isPressed('KeyQ') || isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextW = (r.p1W + n - 1) % n;
          r = { ...r, p1W: nextW };
          session?.send({ type: 'SYNC_WEAPON', p1W: nextW, p1WLock: false });
        }
        if (isPressed('KeyE') || isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextW = (r.p1W + 1) % n;
          r = { ...r, p1W: nextW };
          session?.send({ type: 'SYNC_WEAPON', p1W: nextW, p1WLock: false });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p1WLock: true };
          session?.send({ type: 'SYNC_WEAPON', p1W: r.p1W, p1WLock: true });
        }
      } else if (u.netRole === 'p2' && !u.p2WLock) {
        if (isPressed('KeyQ') || isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextW = (r.p2W + n - 1) % n;
          r = { ...r, p2W: nextW };
          session?.send({ type: 'SYNC_WEAPON', p2W: nextW, p2WLock: false });
        }
        if (isPressed('KeyE') || isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextW = (r.p2W + 1) % n;
          r = { ...r, p2W: nextW };
          session?.send({ type: 'SYNC_WEAPON', p2W: nextW, p2WLock: false });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p2WLock: true };
          session?.send({ type: 'SYNC_WEAPON', p2W: r.p2W, p2WLock: true });
        }
      }
    } else {
      if (!u.p1WLock) {
        if (isPressed('KeyQ') || isPressed('KeyA') || isPressed('ArrowLeft')) r = { ...r, p1W: (r.p1W + n - 1) % n };
        if (isPressed('KeyE') || isPressed('KeyD') || isPressed('ArrowRight')) r = { ...r, p1W: (r.p1W + 1) % n };
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) r = { ...r, p1WLock: true };
      }
    }

    if (isPressed('Escape')) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: 'select' });
      return { ...u, screen: 'select', sel: 0 };
    }
    const ready = multi ? (r.p1WLock && r.p2WLock) : r.p1WLock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: 'special' });
      return { ...r, screen: 'special', p1SpecialLock: false, p2SpecialLock: false, sel: 0 };
    }
    return r;
  }

  if (u.screen === 'special') {
    let r = u;
    const multi = u.mode === 'multi', n = SPECIALS.length;
    const session = getActiveSession();
    const p1Idx = SPECIALS.findIndex(s => s.id === r.p1Special);
    const p2Idx = SPECIALS.findIndex(s => s.id === r.p2Special);

    if (multi) {
      if (u.netRole === 'p1' && !u.p1SpecialLock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextSp = SPECIALS[(p1Idx + n - 1) % n].id;
          r = { ...r, p1Special: nextSp };
          session?.send({ type: 'SYNC_SPECIAL', p1Special: nextSp, p1SpecialLock: false });
        }
        if (isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextSp = SPECIALS[(p1Idx + 1) % n].id;
          r = { ...r, p1Special: nextSp };
          session?.send({ type: 'SYNC_SPECIAL', p1Special: nextSp, p1SpecialLock: false });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p1SpecialLock: true };
          session?.send({ type: 'SYNC_SPECIAL', p1Special: r.p1Special, p1SpecialLock: true });
        }
      } else if (u.netRole === 'p2' && !u.p2SpecialLock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) {
          const nextSp = SPECIALS[(p2Idx + n - 1) % n].id;
          r = { ...r, p2Special: nextSp };
          session?.send({ type: 'SYNC_SPECIAL', p2Special: nextSp, p2SpecialLock: false });
        }
        if (isPressed('KeyD') || isPressed('ArrowRight')) {
          const nextSp = SPECIALS[(p2Idx + 1) % n].id;
          r = { ...r, p2Special: nextSp };
          session?.send({ type: 'SYNC_SPECIAL', p2Special: nextSp, p2SpecialLock: false });
        }
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
          r = { ...r, p2SpecialLock: true };
          session?.send({ type: 'SYNC_SPECIAL', p2Special: r.p2Special, p2SpecialLock: true });
        }
      }
    } else {
      if (!u.p1SpecialLock) {
        if (isPressed('KeyA') || isPressed('ArrowLeft')) r = { ...r, p1Special: SPECIALS[(p1Idx + n - 1) % n].id };
        if (isPressed('KeyD') || isPressed('ArrowRight')) r = { ...r, p1Special: SPECIALS[(p1Idx + 1) % n].id };
        if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) r = { ...r, p1SpecialLock: true };
      }
    }

    if (isPressed('Escape')) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: 'weapon' });
      return { ...u, screen: 'weapon', sel: 0 };
    }
    const ready = multi ? (r.p1SpecialLock && r.p2SpecialLock) : r.p1SpecialLock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      if (multi) session?.send({ type: 'GOTO_SCREEN', screen: 'env' });
      return { ...r, screen: 'env', envLock: false, sel: 0 };
    }
    return r;
  }

  if (u.screen === 'env') {
    let r = u;
    const n = ENVIRONMENTS.length;
    const session = getActiveSession();
    const envIdx = ENVIRONMENTS.findIndex(e => e.id === r.env);

    if (!u.envLock) {
      if (isPressed('KeyA') || isPressed('ArrowLeft')) {
        const nextEnv = ENVIRONMENTS[(envIdx + n - 1) % n].id;
        r = { ...r, env: nextEnv };
        if (u.mode === 'multi') session?.send({ type: 'SYNC_ENV', env: nextEnv, envLock: false });
      }
      if (isPressed('KeyD') || isPressed('ArrowRight')) {
        const nextEnv = ENVIRONMENTS[(envIdx + 1) % n].id;
        r = { ...r, env: nextEnv };
        if (u.mode === 'multi') session?.send({ type: 'SYNC_ENV', env: nextEnv, envLock: false });
      }
      if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) {
        r = { ...r, envLock: true };
        if (u.mode === 'multi') session?.send({ type: 'SYNC_ENV', env: r.env, envLock: true });
      }
    }
    if (isPressed('Escape')) {
      if (u.mode === 'multi') session?.send({ type: 'GOTO_SCREEN', screen: 'special' });
      return { ...u, screen: 'special', sel: 0 };
    }
    if (u.envLock && (isPressed('Enter') || isPressed('Space'))) {
      const next = startFight(r);
      if (u.mode === 'multi') session?.send({ type: 'START_FIGHT', fightCfg: next.fightCfg });
      return next;
    }
    return r;
  }

  return u;
}

export default function App() {
  const [ui, setUi] = useState(INIT);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // Real-time synchronization message handler during selection screens
  useEffect(() => {
    const session = getActiveSession();
    if (!session || ui.screen === 'fight') return;

    session.setMessageHandler((msg) => {
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'HANDSHAKE') {
        // If Host receives Handshake from Guest, broadcast full current state
        if (uiRef.current.isHost) {
          const u = uiRef.current;
          session.send({
            type: 'FULL_SYNC',
            screen: u.screen,
            p1Idx: u.p1Idx, p1Lock: u.p1Lock, p1Special: u.p1Special,
            p2Idx: u.p2Idx, p2Lock: u.p2Lock, p2Special: u.p2Special,
            p1W: u.p1W, p1WLock: u.p1WLock,
            p2W: u.p2W, p2WLock: u.p2WLock,
            p1SpecialLock: u.p1SpecialLock, p2SpecialLock: u.p2SpecialLock,
            env: u.env, envLock: u.envLock,
          });
        }
        return;
      }

      if (msg.type === 'FULL_SYNC') {
        setUi((s) => ({
          ...s,
          screen: msg.screen ?? s.screen,
          p1Idx: msg.p1Idx ?? s.p1Idx,
          p1Lock: msg.p1Lock ?? s.p1Lock,
          p1Special: msg.p1Special ?? s.p1Special,
          p2Idx: msg.p2Idx ?? s.p2Idx,
          p2Lock: msg.p2Lock ?? s.p2Lock,
          p2Special: msg.p2Special ?? s.p2Special,
          p1W: msg.p1W ?? s.p1W,
          p1WLock: msg.p1WLock ?? s.p1WLock,
          p2W: msg.p2W ?? s.p2W,
          p2WLock: msg.p2WLock ?? s.p2WLock,
          p1SpecialLock: msg.p1SpecialLock ?? s.p1SpecialLock,
          p2SpecialLock: msg.p2SpecialLock ?? s.p2SpecialLock,
          env: msg.env ?? s.env,
          envLock: msg.envLock ?? s.envLock,
        }));
        return;
      }

      if (msg.type === 'SYNC_SELECT') {
        setUi((s) => ({
          ...s,
          p1Idx: msg.p1Idx !== undefined ? msg.p1Idx : s.p1Idx,
          p1Lock: msg.p1Lock !== undefined ? msg.p1Lock : s.p1Lock,
          p1Special: msg.p1Special !== undefined ? msg.p1Special : s.p1Special,
          p2Idx: msg.p2Idx !== undefined ? msg.p2Idx : s.p2Idx,
          p2Lock: msg.p2Lock !== undefined ? msg.p2Lock : s.p2Lock,
          p2Special: msg.p2Special !== undefined ? msg.p2Special : s.p2Special,
        }));
        sfx(msg.p1Lock || msg.p2Lock ? 'confirm' : 'select');
        return;
      }

      if (msg.type === 'SYNC_WEAPON') {
        setUi((s) => ({
          ...s,
          p1W: msg.p1W !== undefined ? msg.p1W : s.p1W,
          p1WLock: msg.p1WLock !== undefined ? msg.p1WLock : s.p1WLock,
          p2W: msg.p2W !== undefined ? msg.p2W : s.p2W,
          p2WLock: msg.p2WLock !== undefined ? msg.p2WLock : s.p2WLock,
        }));
        sfx(msg.p1WLock || msg.p2WLock ? 'confirm' : 'select');
        return;
      }

      if (msg.type === 'SYNC_SPECIAL') {
        setUi((s) => ({
          ...s,
          p1Special: msg.p1Special !== undefined ? msg.p1Special : s.p1Special,
          p1SpecialLock: msg.p1SpecialLock !== undefined ? msg.p1SpecialLock : s.p1SpecialLock,
          p2Special: msg.p2Special !== undefined ? msg.p2Special : s.p2Special,
          p2SpecialLock: msg.p2SpecialLock !== undefined ? msg.p2SpecialLock : s.p2SpecialLock,
        }));
        sfx(msg.p1SpecialLock || msg.p2SpecialLock ? 'confirm' : 'select');
        return;
      }

      if (msg.type === 'SYNC_ENV') {
        setUi((s) => ({
          ...s,
          env: msg.env !== undefined ? msg.env : s.env,
          envLock: msg.envLock !== undefined ? msg.envLock : s.envLock,
        }));
        sfx(msg.envLock ? 'confirm' : 'select');
        return;
      }

      if (msg.type === 'GOTO_SCREEN') {
        setUi((s) => ({
          ...s,
          screen: msg.screen,
          sel: 0,
        }));
        sfx('confirm');
        return;
      }

      if (msg.type === 'START_FIGHT') {
        setUi((s) => ({
          ...s,
          screen: 'fight',
          result: null,
          fightCfg: {
            ...msg.fightCfg,
            netRole: s.netRole,
          },
        }));
        sfx('confirm');
        return;
      }
    });
  }, [ui.screen]);

  // Menu loop: reads keys for every non-fight screen.
  useEffect(() => {
    let raf = 0, alive = true;
    const tick = () => {
      if (!alive) return;
      const u = uiRef.current;
      if (u.screen !== 'fight') {
        const next = keyStep(u);
        if (next !== u) {
          const locked = next.p1Lock !== u.p1Lock || next.p2Lock !== u.p2Lock || next.p1WLock !== u.p1WLock
            || next.p2WLock !== u.p2WLock || next.p1SpecialLock !== u.p1SpecialLock || next.p2SpecialLock !== u.p2SpecialLock || next.envLock !== u.envLock;
          if (next.screen !== u.screen || locked) sfx('confirm');
          else if (next.sel !== u.sel || next.p1Idx !== u.p1Idx || next.p2Idx !== u.p2Idx || next.p1W !== u.p1W
            || next.p2W !== u.p2W || next.p1Special !== u.p1Special || next.p2Special !== u.p2Special || next.env !== u.env) sfx('select');
          setUi(next);
        }
        endFrame();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

  // Menu music. On the select screen, the highlighted fighter's entry song plays.
  useEffect(() => {
    if (ui.screen === 'fight') return;
    if (ui.screen === 'select') playMusic(entrySongFor(CHARS[ui.p1Idx].name));
    else playMusic(MUSIC.menu);
  }, [ui.screen, ui.p1Idx]);

  const u = ui;

  if (u.screen === 'fight') {
    return (
      <div className="fight">
        <FightScreen
          config={u.fightCfg}
          onExit={() => setUi((s) => ({ ...s, screen: 'menu', sel: 0 }))}
          onFinish={(winner, wins) => setUi((s) => ({ ...s, screen: 'result', result: { winner, wins }, sel: 0 }))}
        />
      </div>
    );
  }

  if (u.screen === 'select') {
    return (
      <CharSelect
        u={u}
        ready={u.mode === 'multi' ? (u.p1Lock && u.p2Lock) : u.p1Lock}
        onPick={(i) => {
          setUi((s) => {
            const isMulti = s.mode === 'multi';
            const session = getActiveSession();
            if (isMulti && s.netRole === 'p2') {
              const sp = CHARS[i].special;
              session?.send({ type: 'SYNC_SELECT', p2Idx: i, p2Lock: true, p2Special: sp });
              return { ...s, p2Idx: i, p2Lock: true, p2Special: sp };
            }
            const sp = CHARS[i].special;
            if (isMulti) {
              session?.send({ type: 'SYNC_SELECT', p1Idx: i, p1Lock: true, p1Special: sp });
            }
            return { ...s, p1Idx: i, p1Lock: true, p1Special: sp };
          });
        }}
        onBack={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: selectBack(u) });
          setUi((s) => ({ ...s, screen: selectBack(s), sel: 0 }));
        }}
        onNext={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'weapon' });
          setUi((s) => ({ ...s, screen: 'weapon', p1WLock: false, p2WLock: false, sel: 0 }));
        }}
      />
    );
  }

  if (u.screen === 'weapon') {
    return (
      <WeaponSelect
        u={u}
        ready={u.mode === 'multi' ? (u.p1WLock && u.p2WLock) : u.p1WLock}
        onPick={(i) => {
          setUi((s) => {
            const isMulti = s.mode === 'multi';
            const session = getActiveSession();
            if (isMulti && s.netRole === 'p2') {
              session?.send({ type: 'SYNC_WEAPON', p2W: i, p2WLock: true });
              return { ...s, p2W: i, p2WLock: true };
            }
            if (isMulti) {
              session?.send({ type: 'SYNC_WEAPON', p1W: i, p1WLock: true });
            }
            return { ...s, p1W: i, p1WLock: true };
          });
        }}
        onBack={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'select' });
          setUi((s) => ({ ...s, screen: 'select', sel: 0 }));
        }}
        onStart={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'special' });
          setUi((s) => ({ ...s, screen: 'special', p1SpecialLock: false, p2SpecialLock: false, sel: 0 }));
        }}
      />
    );
  }

  if (u.screen === 'special') {
    return (
      <SpecialSelect
        u={u}
        ready={u.mode === 'multi' ? (u.p1SpecialLock && u.p2SpecialLock) : u.p1SpecialLock}
        onPick={(i) => {
          setUi((s) => {
            const isMulti = s.mode === 'multi';
            const session = getActiveSession();
            const sp = SPECIALS[i].id;
            if (isMulti && s.netRole === 'p2') {
              session?.send({ type: 'SYNC_SPECIAL', p2Special: sp, p2SpecialLock: true });
              return { ...s, p2Special: sp, p2SpecialLock: true };
            }
            if (isMulti) {
              session?.send({ type: 'SYNC_SPECIAL', p1Special: sp, p1SpecialLock: true });
            }
            return { ...s, p1Special: sp, p1SpecialLock: true };
          });
        }}
        onBack={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'weapon' });
          setUi((s) => ({ ...s, screen: 'weapon', sel: 0 }));
        }}
        onNext={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'env' });
          setUi((s) => ({ ...s, screen: 'env', envLock: false, sel: 0 }));
        }}
      />
    );
  }

  if (u.screen === 'room') {
    return (
      <RoomScreen
        u={u}
        onBack={() => {
          closeActiveSession();
          setUi((s) => ({ ...s, screen: 'mode', sel: 0 }));
        }}
        onJoin={(code, isHost) => {
          const session = createMultiplayerSession({
            roomCode: code,
            isHost,
            onStatusChange: (status) => {
              setUi((s) => ({ ...s, netStatus: status }));
            },
          });
          setUi((s) => ({
            ...s,
            screen: 'select',
            mode: 'multi',
            roomCode: code,
            isHost,
            netRole: isHost ? 'p1' : 'p2',
            netStatus: session.getStatus(),
            p1Lock: false,
            p2Lock: false,
            p1WLock: false,
            p2WLock: false,
            p1SpecialLock: false,
            p2SpecialLock: false,
            envLock: false,
            sel: 0,
          }));
        }}
      />
    );
  }

  if (u.screen === 'env') {
    return (
      <EnvSelect
        u={u}
        ready={u.envLock}
        onPick={(i) => {
          setUi((s) => {
            const envId = ENVIRONMENTS[i].id;
            if (s.mode === 'multi') {
              getActiveSession()?.send({ type: 'SYNC_ENV', env: envId, envLock: true });
            }
            return { ...s, env: envId, envLock: true };
          });
        }}
        onBack={() => {
          if (u.mode === 'multi') getActiveSession()?.send({ type: 'GOTO_SCREEN', screen: 'special' });
          setUi((s) => ({ ...s, screen: 'special', sel: 0 }));
        }}
        onStart={() => {
          setUi((s) => {
            const next = startFight(s);
            if (s.mode === 'multi') {
              getActiveSession()?.send({ type: 'START_FIGHT', fightCfg: next.fightCfg });
            }
            return next;
          });
        }}
      />
    );
  }

  return <MenuScreen u={u} setUi={setUi} />;
}

function NetStatusBanner({ u }) {
  if (u.mode !== 'multi') return null;
  const isP1 = u.netRole === 'p1';
  const isConnected = u.netStatus === 'connected';
  const roleName = isP1 ? 'PLAYER 1 (HOST)' : 'PLAYER 2 (GUEST)';
  return (
    <div className="net-status-banner">
      <span className={`net-dot ${isConnected ? 'green' : 'pulse-yellow'}`} />
      <span className="net-info">
        ROOM: <strong>{u.roomCode}</strong> · {isConnected ? 'CONNECTED' : 'WAITING FOR OPPONENT...'} · YOU: <strong>{roleName}</strong>
      </span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <div className="bar"><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>
    </div>
  );
}

function MenuScreen({ u, setUi }) {
  const items = MENU[u.screen];
  const pick = (i) => setUi((s) => activate(s, MENU[s.screen][i]));
  const hover = (i) => setUi((s) => (s.sel === i ? s : { ...s, sel: i }));

  const buttons = (
    <div className="btn-col">
      {items.map((it, i) => (
        <button
          key={it.label}
          className={'btn' + (i === u.sel ? ' active' : '')}
          onMouseEnter={() => hover(i)}
          onClick={() => pick(i)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );

  if (u.screen === 'menu') {
    return (
      <div className="screen">
        <h1 className="title">DOJO FIGHT</h1>
        <p className="sub">Martial arts. Real-time multiplayer. Tournament ready.</p>
        {buttons}
      </div>
    );
  }

  if (u.screen === 'mode') {
    return (
      <div className="screen">
        <h2 className="heading">CHOOSE MODE</h2>
        {buttons}
      </div>
    );
  }

  // result
  const r = u.result;
  const single = u.mode === 'single';
  const msg = r.winner === 0
    ? (single ? 'YOU WIN THE MATCH!' : 'PLAYER 1 WINS THE MATCH')
    : (single ? 'CPU WINS THE MATCH' : 'PLAYER 2 WINS THE MATCH');
  return (
    <div className="screen">
      <h2 className="heading">{msg}</h2>
      <p className="sub">Score {r.wins[0]} - {r.wins[1]}</p>
      {buttons}
    </div>
  );
}

function CharSelect({ u, ready, onPick, onBack, onNext }) {
  const multi = u.mode === 'multi';
  const isP1 = u.netRole === 'p1';
  const p1Tag = multi ? (isP1 ? 'P1 (YOU)' : 'P1 (OPPONENT)') : 'P1';
  const p2Tag = multi ? (isP1 ? 'P2 (OPPONENT)' : 'P2 (YOU)') : 'P2';

  return (
    <div className="screen">
      <NetStatusBanner u={u} />
      <h2 className="heading">CHOOSE YOUR FIGHTER</h2>
      <div className="cards">
        {CHARS.map((c, i) => {
          const picked = u.p1Idx === i || (multi && u.p2Idx === i);
          return (
            <div key={c.name} className={'card' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {u.p1Idx === i && <span className="tag p1">{p1Tag}{u.p1Lock ? ' · LOCKED' : ''}</span>}
              {multi && u.p2Idx === i && <span className="tag p2">{p2Tag}{u.p2Lock ? ' · LOCKED' : ''}</span>}
              <div className="card-name">{c.name}</div>
              <FighterPreview index={i} />
              <Stat label="SPD" value={c.speed / 5.5} />
              <Stat label="PWR" value={c.power / 1.25} />
              <div className="desc">{c.desc}</div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        {multi
          ? (isP1
              ? (u.p1Lock ? (u.p2Lock ? 'Both locked in! Press Enter or Next' : 'Locked in! Waiting for opponent...') : 'A / D to browse your fighter, J to lock in')
              : (u.p2Lock ? (u.p1Lock ? 'Both locked in! Press Enter or Next' : 'Locked in! Waiting for opponent...') : 'A / D to browse your fighter, J to lock in'))
          : 'A / D to browse, J to lock in'}
      </p>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        {ready && <button className="btn primary" onClick={onNext}>Next: Weapons</button>}
      </div>
    </div>
  );
}

function WeaponSelect({ u, ready, onPick, onBack, onStart }) {
  const multi = u.mode === 'multi';
  const isP1 = u.netRole === 'p1';
  const p1Tag = multi ? (isP1 ? 'P1 (YOU)' : 'P1 (OPPONENT)') : 'P1';
  const p2Tag = multi ? (isP1 ? 'P2 (OPPONENT)' : 'P2 (YOU)') : 'P2';

  return (
    <div className="screen">
      <NetStatusBanner u={u} />
      <h2 className="heading">CHOOSE YOUR WEAPON</h2>
      <div className="cards">
        {WEAPONS.map((w, i) => {
          const picked = u.p1W === i || (multi && u.p2W === i);
          return (
            <div key={w.name} className={'card narrow' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {u.p1W === i && <span className="tag p1">{p1Tag}{u.p1WLock ? ' · LOCKED' : ''}</span>}
              {multi && u.p2W === i && <span className="tag p2">{p2Tag}{u.p2WLock ? ' · LOCKED' : ''}</span>}
              <div className="card-name">{w.name}</div>
              <WeaponPreview index={i} />
              <Stat label="RCH" value={(w.reach + 10) / 60} />
              <Stat label="DMG" value={(w.dmg - 0.9) / 0.6} />
              <Stat label="SPD" value={(6 - w.slow) / 6} />
              <div className="desc">{w.desc}</div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        {multi
          ? (isP1
              ? (u.p1WLock ? (u.p2WLock ? 'Both locked in! Press Enter or Next' : 'Weapon locked! Waiting for opponent...') : 'Q / E to browse weapons, J to lock in')
              : (u.p2WLock ? (u.p1WLock ? 'Both locked in! Press Enter or Next' : 'Weapon locked! Waiting for opponent...') : 'Q / E to browse weapons, J to lock in'))
          : 'Q / E to browse, J to lock in'}
      </p>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        {ready && <button className="btn primary" onClick={onStart}>Next: Special Power</button>}
      </div>
    </div>
  );
}

function SpecialSelect({ u, ready, onPick, onBack, onNext }) {
  const multi = u.mode === 'multi';
  const isP1 = u.netRole === 'p1';
  const p1Idx = SPECIALS.findIndex(s => s.id === u.p1Special);
  const p2Idx = SPECIALS.findIndex(s => s.id === u.p2Special);
  const p1Tag = multi ? (isP1 ? 'P1 (YOU)' : 'P1 (OPPONENT)') : 'P1';
  const p2Tag = multi ? (isP1 ? 'P2 (OPPONENT)' : 'P2 (YOU)') : 'P2';

  return (
    <div className="screen">
      <NetStatusBanner u={u} />
      <h2 className="heading">CHOOSE YOUR SPECIAL POWER</h2>
      <div className="cards">
        {SPECIALS.map((s, i) => {
          const picked = p1Idx === i || (multi && p2Idx === i);
          return (
            <div key={s.id} className={'card' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {p1Idx === i && <span className="tag p1">{p1Tag}{u.p1SpecialLock ? ' · LOCKED' : ''}</span>}
              {multi && p2Idx === i && <span className="tag p2">{p2Tag}{u.p2SpecialLock ? ' · LOCKED' : ''}</span>}
              <div className="card-name">{s.name}</div>
              <div className="preview-card">
                <div className="preview-swatch" style={{ background: s.color }} />
                <span className="preview-label">{s.desc}</span>
              </div>
              <div className="desc">{s.desc}</div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        {multi
          ? (isP1
              ? (u.p1SpecialLock ? (u.p2SpecialLock ? 'Both locked in! Press Enter or Next' : 'Power locked! Waiting for opponent...') : 'A / D to browse specials, J to lock in')
              : (u.p2SpecialLock ? (u.p1SpecialLock ? 'Both locked in! Press Enter or Next' : 'Power locked! Waiting for opponent...') : 'A / D to browse specials, J to lock in'))
          : 'A / D to browse, J to lock in'}
      </p>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        {ready && <button className="btn primary" onClick={onNext}>Next: Environment</button>}
      </div>
    </div>
  );
}

function EnvSelect({ u, ready, onPick, onBack, onStart }) {
  return (
    <div className="screen">
      <NetStatusBanner u={u} />
      <h2 className="heading">CHOOSE ENVIRONMENT</h2>
      <div className="cards">
        {ENVIRONMENTS.map((e, i) => {
          const picked = e.id === u.env;
          return (
            <div key={e.id} className={'card env-card' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              <div className="env-swatch" style={{ background: e.bgColor }} />
              <div className="card-name">{e.name}</div>
              <div className="desc">{e.desc}</div>
            </div>
          );
        })}
      </div>
      <p className="hint">
        {u.mode === 'multi'
          ? (u.envLock ? 'Environment locked! Press Enter or Start Fight.' : 'A / D to browse · J / Enter to lock in')
          : 'A / D to browse · J / Enter to lock'}
      </p>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        {ready && <button className="btn primary" onClick={onStart}>Start Fight</button>}
      </div>
    </div>
  );
}

function RoomScreen({ u, onBack, onJoin }) {
  const [code, setCode] = useState(u.roomCode || '');
  const [tab, setTab] = useState('join');
  const [createdCode, setCreatedCode] = useState(u.roomCode || randomRoom());

  const handleJoin = (e) => {
    if (e) e.preventDefault();
    const finalCode = (tab === 'join' ? code : createdCode).trim().toUpperCase();
    if (!finalCode) return;
    sfx('confirm');
    onJoin(finalCode, tab === 'create');
  };

  const handleGenerate = () => {
    const fresh = randomRoom();
    setCreatedCode(fresh);
    sfx('select');
  };

  return (
    <div className="screen">
      <h2 className="heading">MULTIPLAYER ROOM</h2>

      <div className="room-tabs">
        <button
          className={'room-tab' + (tab === 'join' ? ' active' : '')}
          onClick={() => { setTab('join'); sfx('select'); }}
        >
          Enter Code (Join P2)
        </button>
        <button
          className={'room-tab' + (tab === 'create' ? ' active' : '')}
          onClick={() => { setTab('create'); sfx('select'); }}
        >
          Create Room (Host P1)
        </button>
      </div>

      <div className="room-box">
        {tab === 'join' ? (
          <form onSubmit={handleJoin} className="room-form">
            <p className="sub">ENTER ROOM CODE TO JOIN MATCH</p>
            <input
              type="text"
              className="room-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="CODE"
              autoFocus
              maxLength={6}
            />
            <p className="note">Type the room code from your opponent to connect as Player 2.</p>
            <div className="btn-col" style={{ marginTop: '6px' }}>
              <button
                type="submit"
                className="btn primary"
                disabled={!code.trim()}
              >
                Join as Player 2 ({code.trim() || '....'})
              </button>
            </div>
          </form>
        ) : (
          <div className="room-form">
            <p className="sub">SHARE THIS ROOM CODE WITH OPPONENT</p>
            <div className="room-code">{createdCode.split('').join(' ')}</div>
            <button className="btn" onClick={handleGenerate} style={{ fontSize: '16px', padding: '8px 16px' }}>
              🎲 Generate New Code
            </button>
            <div className="btn-col" style={{ marginTop: '6px' }}>
              <button className="btn primary" onClick={handleJoin}>
                Host Match as Player 1
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="btn" onClick={onBack} style={{ marginTop: '8px' }}>
        Back
      </button>
    </div>
  );
}
