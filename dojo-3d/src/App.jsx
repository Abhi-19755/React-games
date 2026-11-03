import { useEffect, useRef, useState } from 'react';
import FightScreen from './FightScreen.jsx';
import { FighterPreview, WeaponPreview } from './Previews.jsx';
import { CHARS, WEAPONS, SPECIALS, ENVIRONMENTS } from './game/data.js';
import { isPressed, endFrame } from './game/input.js';

const INIT = {
  screen: 'menu',        // menu | mode | room | select | weapon | special | env | fight | result
  mode: 'single',        // single | multi
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
  room:   [{ label: 'Continue', to: 'select' }, { label: 'Back', to: 'mode' }],
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
      p1Char: u.p1Idx, p1Weapon: u.p1W, p1Special: u.p1Special,
      p2Char: cpu ? Math.floor(Math.random() * CHARS.length) : u.p2Idx,
      p2Weapon: cpu ? Math.floor(Math.random() * WEAPONS.length) : u.p2W,
      p2Special: cpu ? SPECIALS[Math.floor(Math.random() * SPECIALS.length)].id : u.p2Special,
      env: u.env,
    },
  };
}

function activate(u, item) {
  if (item.fight) return startFight(u);
  if (item.to === 'room') return { ...u, screen: 'room', mode: 'multi', roomCode: randomRoom(), sel: 0 };
  if (item.to === 'select') return { ...u, screen: 'select', mode: item.mode ?? u.mode, p1Lock: false, p2Lock: false, sel: 0 };
  return { ...u, screen: item.to, mode: item.mode ?? u.mode, sel: 0 };
}

// Keyboard handling for every screen except the fight. Returns the same
// object when nothing changed, so React can skip the re-render.
function keyStep(u) {
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
    if (!u.p1Lock) {
      if (isPressed('KeyA')) r = { ...r, p1Idx: (r.p1Idx + 2) % 3 };
      if (isPressed('KeyD')) r = { ...r, p1Idx: (r.p1Idx + 1) % 3 };
      if (isPressed('KeyJ')) r = { ...r, p1Lock: true };
    }
    if (multi && !u.p2Lock) {
      if (isPressed('ArrowLeft')) r = { ...r, p2Idx: (r.p2Idx + 2) % 3 };
      if (isPressed('ArrowRight')) r = { ...r, p2Idx: (r.p2Idx + 1) % 3 };
      if (isPressed('Numpad1')) r = { ...r, p2Lock: true };
    }
    if (isPressed('Escape')) return { ...u, screen: selectBack(u), sel: 0 };
    const ready = multi ? (r.p1Lock && r.p2Lock) : r.p1Lock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      return startFight(r);
    }
  }

  if (u.screen === 'weapon') {
    let r = u;
    const multi = u.mode === 'multi', n = WEAPONS.length;
    if (!u.p1WLock) {
      if (isPressed('KeyQ')) r = { ...r, p1W: (r.p1W + n - 1) % n };
      if (isPressed('KeyE')) r = { ...r, p1W: (r.p1W + 1) % n };
      if (isPressed('KeyJ')) r = { ...r, p1WLock: true };
    }
    if (multi && !u.p2WLock) {
      if (isPressed('Numpad4')) r = { ...r, p2W: (r.p2W + n - 1) % n };
      if (isPressed('Numpad6')) r = { ...r, p2W: (r.p2W + 1) % n };
      if (isPressed('Numpad1')) r = { ...r, p2WLock: true };
    }
    if (isPressed('Escape')) return { ...u, screen: 'select', sel: 0 };
    const ready = multi ? (r.p1WLock && r.p2WLock) : r.p1WLock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      return { ...r, screen: 'special', p1SpecialLock: false, p2SpecialLock: false, sel: 0 };
    }
  }

  if (u.screen === 'special') {
    let r = u;
    const multi = u.mode === 'multi', n = SPECIALS.length;
    if (!u.p1SpecialLock) {
      if (isPressed('KeyA')) r = { ...r, p1Special: SPECIALS[(r.p1SpecialIdx + n - 1) % n].id };
      if (isPressed('KeyD')) r = { ...r, p1Special: SPECIALS[(r.p1SpecialIdx + 1) % n].id };
      if (isPressed('KeyJ')) r = { ...r, p1SpecialLock: true };
    }
    if (multi && !u.p2SpecialLock) {
      if (isPressed('ArrowLeft')) r = { ...r, p2Special: SPECIALS[(r.p2SpecialIdx + n - 1) % n].id };
      if (isPressed('ArrowRight')) r = { ...r, p2Special: SPECIALS[(r.p2SpecialIdx + 1) % n].id };
      if (isPressed('Numpad1')) r = { ...r, p2SpecialLock: true };
    }
    if (isPressed('Escape')) return { ...u, screen: 'weapon', sel: 0 };
    const ready = multi ? (r.p1SpecialLock && r.p2SpecialLock) : r.p1SpecialLock;
    if (ready && (isPressed('Enter') || isPressed('Space'))) {
      return { ...r, screen: 'env', envLock: false, sel: 0 };
    }
    return r;
  }

  if (u.screen === 'env') {
    let r = u;
    const n = ENVIRONMENTS.length;
    if (!u.envLock) {
      if (isPressed('KeyA') || isPressed('ArrowLeft')) r = { ...r, env: ENVIRONMENTS[(r.envIdx + n - 1) % n].id };
      if (isPressed('KeyD') || isPressed('ArrowRight')) r = { ...r, env: ENVIRONMENTS[(r.envIdx + 1) % n].id };
      if (isPressed('KeyJ') || isPressed('Enter') || isPressed('Space')) r = { ...r, envLock: true };
    }
    if (isPressed('Escape')) return { ...u, screen: 'special', sel: 0 };
    if (u.envLock && (isPressed('Enter') || isPressed('Space'))) return startFight(r);
    return r;
  }

  return u;
}

export default function App() {
  const [ui, setUi] = useState(INIT);
  const uiRef = useRef(ui);
  uiRef.current = ui;

  // Menu loop: reads keys for every non-fight screen.
  useEffect(() => {
    let raf = 0, alive = true;
    const tick = () => {
      if (!alive) return;
      const u = uiRef.current;
      if (u.screen !== 'fight') {
        const next = keyStep(u);
        if (next !== u) setUi(next);
        endFrame();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);

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
        onPick={(i) => setUi((s) => {
          if (!s.p1Lock) return { ...s, p1Idx: i, p1Lock: true };
          if (s.mode === 'multi' && !s.p2Lock) return { ...s, p2Idx: i, p2Lock: true };
          return s;
        })}
        onBack={() => setUi((s) => ({ ...s, screen: selectBack(s), sel: 0 }))}
        onNext={() => setUi((s) => ({ ...s, screen: 'weapon', p1WLock: false, p2WLock: false, sel: 0 }))}
      />
    );
  }

  if (u.screen === 'weapon') {
    return (
      <WeaponSelect
        u={u}
        ready={u.mode === 'multi' ? (u.p1WLock && u.p2WLock) : u.p1WLock}
        onPick={(i) => setUi((s) => {
          if (!s.p1WLock) return { ...s, p1W: i, p1WLock: true };
          if (s.mode === 'multi' && !s.p2WLock) return { ...s, p2W: i, p2WLock: true };
          return s;
        })}
        onBack={() => setUi((s) => ({ ...s, screen: 'select', sel: 0 }))}
        onStart={() => setUi((s) => ({ ...s, screen: 'special', p1SpecialLock: false, p2SpecialLock: false, sel: 0 }))}
      />
    );
  }

  if (u.screen === 'special') {
    return (
      <SpecialSelect
        u={u}
        ready={u.mode === 'multi' ? (u.p1SpecialLock && u.p2SpecialLock) : u.p1SpecialLock}
        onPick={(i) => setUi((s) => {
          const sp = SPECIALS[i].id;
          if (!s.p1SpecialLock) return { ...s, p1Special: sp, p1SpecialLock: true };
          if (s.mode === 'multi' && !s.p2SpecialLock) return { ...s, p2Special: sp, p2SpecialLock: true };
          return s;
        })}
        onBack={() => setUi((s) => ({ ...s, screen: 'weapon', sel: 0 }))}
        onNext={() => setUi((s) => ({ ...s, screen: 'env', envLock: false, sel: 0 }))}
      />
    );
  }

  if (u.screen === 'env') {
    return (
      <EnvSelect
        u={u}
        ready={u.envLock}
        onPick={(i) => setUi((s) => ({ ...s, env: ENVIRONMENTS[i].id, envLock: true }))}
        onBack={() => setUi((s) => ({ ...s, screen: 'special', sel: 0 }))}
        onStart={() => setUi((s) => startFight(s))}
      />
    );
  }

  return <MenuScreen u={u} setUi={setUi} />;
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
        <p className="sub">Martial arts. Multiplayer. Tournament soon.</p>
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

  if (u.screen === 'room') {
    return (
      <div className="screen">
        <h2 className="heading">MULTIPLAYER ROOM</h2>
        <div className="room-code">{u.roomCode.split('').join(' ')}</div>
        <p>Share this code with your opponent.</p>
        <p className="note">Online matchmaking is not connected in this build, so both players use this keyboard.</p>
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
  return (
    <div className="screen">
      <h2 className="heading">CHOOSE YOUR FIGHTER</h2>
      <div className="cards">
        {CHARS.map((c, i) => {
          const picked = u.p1Idx === i || (multi && u.p2Idx === i);
          return (
            <div key={c.name} className={'card' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {u.p1Idx === i && <span className="tag p1">P1{u.p1Lock ? ' · LOCKED' : ''}</span>}
              {multi && u.p2Idx === i && <span className="tag p2">P2{u.p2Lock ? ' · LOCKED' : ''}</span>}
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
          ? 'P1: A / D to browse, J to lock  ·  P2: ← / → to browse, Numpad 1 to lock'
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
  return (
    <div className="screen">
      <h2 className="heading">CHOOSE YOUR WEAPON</h2>
      <div className="cards">
        {WEAPONS.map((w, i) => {
          const picked = u.p1W === i || (multi && u.p2W === i);
          return (
            <div key={w.name} className={'card narrow' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {u.p1W === i && <span className="tag p1">P1{u.p1WLock ? ' · LOCKED' : ''}</span>}
              {multi && u.p2W === i && <span className="tag p2">P2{u.p2WLock ? ' · LOCKED' : ''}</span>}
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
          ? 'P1: Q / E to browse, J to lock  ·  P2: Numpad 4 / 6 to browse, Numpad 1 to lock'
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
  const p1Idx = SPECIALS.findIndex(s => s.id === u.p1Special);
  const p2Idx = SPECIALS.findIndex(s => s.id === u.p2Special);
  return (
    <div className="screen">
      <h2 className="heading">CHOOSE YOUR SPECIAL POWER</h2>
      <div className="cards">
        {SPECIALS.map((s, i) => {
          const picked = p1Idx === i || (multi && p2Idx === i);
          return (
            <div key={s.id} className={'card' + (picked ? ' picked' : '')} onClick={() => onPick(i)}>
              {p1Idx === i && <span className="tag p1">P1{u.p1SpecialLock ? ' · LOCKED' : ''}</span>}
              {multi && p2Idx === i && <span className="tag p2">P2{u.p2SpecialLock ? ' · LOCKED' : ''}</span>}
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
          ? 'P1: A / D to browse, J to lock  ·  P2: ← / → to browse, Numpad 1 to lock'
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
      <p className="hint">A / D to browse · J / Enter to lock</p>
      <div className="row">
        <button className="btn" onClick={onBack}>Back</button>
        {ready && <button className="btn primary" onClick={onStart}>Start Fight</button>}
      </div>
    </div>
  );
}