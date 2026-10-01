import { useMemo, useState } from 'react';
import { getGame } from '../data/games';
import {
  sessionsByDay,
  todayKey,
  useMemoraStore,
  type SessionEntry,
} from '../state/store';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function scrollToGames() {
  document.getElementById('juegos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fmtDia(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtMes(y: number, m: number): string {
  const s = new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtHora(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function intensity(n: number): string {
  if (n >= 3) return 'lvl3';
  if (n === 2) return 'lvl2';
  if (n === 1) return 'lvl1';
  return '';
}

function SessionRow({ s, i }: { s: SessionEntry; i: number }) {
  const g = getGame(s.gameId);
  return (
    <li className="dsess" data-testid={`day-session-${i}`} style={{ ['--accent' as string]: g.color }}>
      <span className="dsess-icon">{g.icono}</span>
      <div className="dsess-main">
        <div className="dsess-name">
          {g.nombre}
          {s.record && <span className="dsess-record">🏅 récord</span>}
        </div>
        {s.detail && <div className="dsess-detail muted">{s.detail}</div>}
      </div>
      <div className="dsess-right">
        <span className="dsess-score">{s.score.toLocaleString('es-ES')}</span>
        <span className="dsess-meta muted">
          {fmtHora(s.ts)} · +{s.xp} XP
        </span>
      </div>
    </li>
  );
}

export default function Dashboard() {
  const s = useMemoraStore();
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(todayKey());

  const byDay = useMemo(() => sessionsByDay(s), [s]);
  const isCurrentMonth = view.y === now.getFullYear() && view.m === now.getMonth();

  const moveMonth = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    const ny = d.getFullYear();
    const nm = d.getMonth();
    setView({ y: ny, m: nm });
    if (ny === now.getFullYear() && nm === now.getMonth()) setSelected(todayKey());
  };

  // Celdas del mes (semana empieza en lunes)
  const cells: (string | null)[] = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const blanks = (first.getDay() + 6) % 7;
    const days = new Date(view.y, view.m + 1, 0).getDate();
    const arr: (string | null)[] = Array(blanks).fill(null);
    for (let d = 1; d <= days; d++) {
      arr.push(`${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return arr;
  }, [view]);

  const monthSessions = useMemo(() => {
    let n = 0,
      pts = 0,
      xp = 0;
    for (const [key, arr] of Object.entries(byDay)) {
      if (!key.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`)) continue;
      n += arr.length;
      for (const e of arr) {
        pts += e.score;
        xp += e.xp;
      }
    }
    return { n, pts, xp };
  }, [byDay, view]);

  const daySessions = byDay[selected] ?? [];
  const dayPts = daySessions.reduce((a, e) => a + e.score, 0);
  const dayXp = daySessions.reduce((a, e) => a + e.xp, 0);
  const workoutDone = (s.workouts[selected] ?? []).length >= 3;

  return (
    <section className="activity" id="actividad" data-testid="dashboard">
      <h2 className="section-title">📊 Mi actividad</h2>
      <div className="dash-grid">
        <section className="card">
          <div className="cal-head">
            <button className="icon-btn" data-testid="cal-prev" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <h2 data-testid="cal-title">{fmtMes(view.y, view.m)}</h2>
            <button className="icon-btn" data-testid="cal-next" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
          {!isCurrentMonth && (
            <button className="btn-ghost" data-testid="cal-today" onClick={() => {
              setView({ y: now.getFullYear(), m: now.getMonth() });
              setSelected(todayKey());
            }}>
              Volver a hoy
            </button>
          )}
          <div className="cal-week">
            {DIAS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((key, i) =>
              key === null ? (
                <span key={`b${i}`} className="cal-day empty" />
              ) : (
                (() => {
                  const n = (byDay[key] ?? []).length;
                  const done = (s.workouts[key] ?? []).length >= 3;
                  return (
                    <button
                      key={key}
                      data-testid={`cal-day-${key}`}
                      data-count={n}
                      className={`cal-day ${intensity(n)}${key === todayKey() ? ' today' : ''}${key === selected ? ' selected' : ''}`}
                      onClick={() => setSelected(key)}
                      title={`${n} ${n === 1 ? 'sesión' : 'sesiones'}`}
                    >
                      <span className="cal-num">{Number(key.slice(8))}</span>
                      {done && <span className="cal-check">✓</span>}
                    </button>
                  );
                })()
              ),
            )}
          </div>
          <div className="cal-legend muted">
            <span className="cal-swatch lvl1" /> 1 sesión
            <span className="cal-swatch lvl2" /> 2 sesiones
            <span className="cal-swatch lvl3" /> 3+
            <span className="cal-check">✓</span> entrenamiento completo
          </div>
        </section>

        <section className="card" data-testid="day-detail">
          <h2>{fmtDia(selected)}</h2>
          {daySessions.length === 0 ? (
            <div className="day-empty">
              <p className="muted">Sin partidas este día.</p>
              <button className="btn-primary" onClick={scrollToGames}>
                🎮 Elegir juego
              </button>
            </div>
          ) : (
            <>
              <div className="day-summary">
                <span className="pill">🎮 {daySessions.length} {daySessions.length === 1 ? 'partida' : 'partidas'}</span>
                <span className="pill">⭐ {dayPts.toLocaleString('es-ES')} pts</span>
                <span className="pill">✨ +{dayXp} XP</span>
                {workoutDone && <span className="pill">✅ entrenamiento</span>}
              </div>
              <ul className="dsess-list">
                {daySessions.map((e, i) => (
                  <SessionRow key={`${e.ts}-${i}`} s={e} i={i} />
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Este mes</h2>
        <div className="progress-nums">
          <div className="stat">
            <span className="stat-val">{monthSessions.n}</span>
            <span className="stat-label">Partidas</span>
          </div>
          <div className="stat">
            <span className="stat-val">{monthSessions.pts.toLocaleString('es-ES')}</span>
            <span className="stat-label">Puntos</span>
          </div>
          <div className="stat">
            <span className="stat-val">+{monthSessions.xp}</span>
            <span className="stat-label">XP</span>
          </div>
        </div>
        <p className="muted foot-note">Tus datos se guardan solo en este dispositivo.</p>
      </section>
    </section>
  );
}
