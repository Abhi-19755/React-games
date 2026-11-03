import { useRef, useState } from 'react';
import Arena3D from './3d/Arena3D.jsx';
import { CHARS, WEAPONS, SPECIAL_COST, SPECIALS } from './game/data.js';

// Text shown across the middle of the screen
function bannerFor(gs) {
  if (gs.done) {
    if (gs.matchWinner === 0) return 'P1 WINS THE MATCH';
    return gs.p2.isAI ? 'CPU WINS THE MATCH' : 'P2 WINS THE MATCH';
  }
  if (gs.phase === 'intro') return gs.phaseT > 40 ? `ROUND ${gs.round}` : 'FIGHT!';
  if (gs.phase === 'ko') return gs.resultText;
  return '';
}

export default function FightScreen({ config, onExit, onFinish }) {
  const els = useRef({});
  const [banner, setBanner] = useState('');
  const lastBanner = useRef('');

  const ref = (key) => (el) => { els.current[key] = el; };

  // Called every frame. Writes straight to the DOM for speed; only the
  // banner goes through React state, and only when its text changes.
  const onTick = (gs) => {
    const e = els.current;
    if (!e.p1Hp) return;
    e.p1Hp.style.width = `${gs.p1.hp}%`;
    e.p2Hp.style.width = `${gs.p2.hp}%`;
    e.p1Mp.style.width = `${gs.p1.meter}%`;
    e.p2Mp.style.width = `${gs.p2.meter}%`;

    // Special bar: pulses and shows a prompt once it is full
    const p1Full = gs.p1.meter >= SPECIAL_COST;
    const p2Full = gs.p2.meter >= SPECIAL_COST;
    e.p1Mp.parentNode.classList.toggle('full', p1Full);
    e.p2Mp.parentNode.classList.toggle('full', p2Full);
    e.p1Ready.textContent = p1Full ? 'SPECIAL READY · PRESS E' : '';
    e.p2Ready.textContent = p2Full ? 'SPECIAL READY · NUM 5' : '';

    e.timer.textContent = String(Math.max(0, Math.ceil(gs.timeLeft / 60)));
    e.round.textContent = `ROUND ${gs.round}`;
    e.score.textContent = `${gs.wins[0]} - ${gs.wins[1]}`;
    e.combo1.textContent = gs.p1.combo > 1 && gs.p1.comboT > 0 ? `${gs.p1.combo} HIT COMBO` : '';
    e.combo2.textContent = gs.p2.combo > 1 && gs.p2.comboT > 0 ? `${gs.p2.combo} HIT COMBO` : '';

    const next = bannerFor(gs);
    if (next !== lastBanner.current) {
      lastBanner.current = next;
      setBanner(next);
    }
  };

  const c1 = CHARS[config.p1Char], c2 = CHARS[config.p2Char];
  const p1Name = `${c1.name} · ${WEAPONS[config.p1Weapon].name}`;
  const p2Name = `${config.mode === 'single' ? 'CPU' : 'P2'} · ${c2.name} · ${WEAPONS[config.p2Weapon].name}`;

  return (
    <div className="fight3d">
      <Arena3D config={config} onTick={onTick} onExit={onExit} onFinish={onFinish} />

      <div className="hud">
        <div className="hud-top">
          <div className="hp-wrap">
            <div className="hp"><div className="hp-fill" ref={ref('p1Hp')} /></div>
            <div className="mp"><div ref={ref('p1Mp')} /></div>
            <div className="ready" ref={ref('p1Ready')} />
            <div className="name">P1 · {p1Name}</div>
            <div className="power">{SPECIALS[0].name}</div>
            <div className="combo" ref={ref('combo1')} />
          </div>

          <div className="center">
            <div className="timer" ref={ref('timer')} />
            <div className="round" ref={ref('round')} />
            <div className="score" ref={ref('score')} />
          </div>

          <div className="hp-wrap right">
            <div className="hp"><div className="hp-fill" ref={ref('p2Hp')} /></div>
            <div className="mp"><div ref={ref('p2Mp')} /></div>
            <div className="ready" ref={ref('p2Ready')} />
            <div className="name">{p2Name}</div>
            <div className="power">{SPECIALS[0].name}</div>
            <div className="combo" ref={ref('combo2')} />
          </div>
        </div>

        {banner && <div className="banner" key={banner}>{banner}</div>}

        <div className="controls-hint">
          P1: A D move · W jump · J jab · U hook · K kick · S+J uppercut · S+K sweep · jump+K flying kick · L block · E special (when bar is full) · Q roll · Esc quit
        </div>
      </div>
    </div>
  );
}
