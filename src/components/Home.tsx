import { GAMES, getGame } from '../data/games';
import {
  actions,
  levelForXp,
  memoryIndex,
  streakCount,
  todayKey,
  useMemoraStore,
  workoutFor,
} from '../state/store';

interface Props {
  onPlay: (gameId: string) => void;
  onStartWorkout: () => void;
  onOpenDashboard: () => void;
}

function Ring({ value }: { value: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg className="ring" width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Índice de memoria ${value}`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#E6E9F5" strokeWidth="12" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 70 70)"
        className="ring-arc"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B5BD6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <text x="70" y="66" textAnchor="middle" className="ring-num">
        {value}
      </text>
      <text x="70" y="88" textAnchor="middle" className="ring-sub">
        / 100
      </text>
    </svg>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="muted">Juega tu primera partida para ver tu evolución.</p>;
  }
  const w = 300;
  const h = 64;
  const max = Math.max(100, ...values);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * (h - 8) - 4}`)
    .join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width="100%" height="64" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#5B5BD6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home({ onPlay, onStartWorkout, onOpenDashboard }: Props) {
  const s = useMemoraStore();
  const index = memoryIndex(s);
  const streak = streakCount(s);
  const nivel = levelForXp(s.xp);
  const ids = workoutFor(new Date());
  const doneToday = (s.workouts[todayKey()] ?? []).length >= 3;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekKey = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
  let weekPoints = 0;
  let totalSessions = 0;
  for (const g of GAMES) {
    const st = s.games[g.id];
    if (!st) continue;
    totalSessions += st.plays;
    for (const e of st.history) if (e.d >= weekKey) weekPoints += e.score;
  }
  const sparkValues = s.indiceHistory.slice(-14).map((e) => e.v);

  return (
    <div className="home" data-testid="home">
      <header className="topbar">
        <div className="logo">
          <span className="logo-brain">🧠</span> MEMORA
        </div>
        <div className="topbar-right">
          <span className="pill" title="Racha de días">🔥 {streak}</span>
          <span className="pill" title="Nivel por XP">⭐ Nv. {nivel}</span>
          <button
            className="icon-btn"
            data-testid="open-dashboard"
            onClick={onOpenDashboard}
            aria-label="Ver mi actividad"
            title="Ver mi actividad"
          >
            📊
          </button>
          <button
            className="icon-btn"
            onClick={() => actions.toggleSound()}
            aria-label={s.sound ? 'Silenciar' : 'Activar sonido'}
            title={s.sound ? 'Silenciar' : 'Activar sonido'}
          >
            {s.sound ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      <section className="card progress-card">
        <h2>Tu progreso</h2>
        <div className="progress-nums">
          <div className="stat">
            <span className="stat-val">{weekPoints}</span>
            <span className="stat-label">Puntos esta semana</span>
          </div>
          <div className="stat">
            <span className="stat-val">{totalSessions}</span>
            <span className="stat-label">Sesiones totales</span>
          </div>
          <div className="stat">
            <span className="stat-val">{s.xp}</span>
            <span className="stat-label">XP total</span>
          </div>
        </div>
        <h3>Evolución del índice</h3>
        <Sparkline values={sparkValues} />
        <button className="btn-ghost" onClick={onOpenDashboard}>
          📊 Ver panel de actividad →
        </button>
      </section>

      <section className="hero card">
        <div className="hero-text">
          <h1>¡Hola! Entrena tu memoria</h1>
          <p className="muted">
            Nueve juegos cortos al día para mantener tu mente ágil. Sin registro: tu progreso vive en
            este dispositivo.
          </p>
          <div className="hero-cta-row">
            <button className="btn-primary" data-testid="workout-start" onClick={onStartWorkout} disabled={doneToday}>
              {doneToday ? '✅ Entrenamiento de hoy completado' : '▶ Empezar entrenamiento de hoy'}
            </button>
          </div>
        </div>
        <div className="hero-ring">
          <Ring value={index} />
          <div className="ring-label">Índice de memoria</div>
        </div>
      </section>

      <section className="card workout-card">
        <h2>Entrenamiento de hoy</h2>
        <p className="muted">Tres juegos seleccionados para ti · 2–4 min cada uno</p>
        <div className="workout-row">
          {ids.map((id, i) => {
            const g = getGame(id);
            return (
              <div key={id} className="workout-chip" style={{ ['--accent' as string]: g.color }}>
                <span className="workout-pos">{i + 1}</span>
                <span className="workout-icon">{g.icono}</span>
                <span className="workout-name">{g.nombre}</span>
              </div>
            );
          })}
        </div>
      </section>

      <h2 className="section-title">Los 9 juegos</h2>
      <div className="grid">
        {GAMES.map((g) => {
          const st = s.games[g.id];
          return (
            <article
              key={g.id}
              className="gcard"
              data-testid={`gcard-${g.id}`}
              style={{ ['--accent' as string]: g.color }}
            >
              <div className="gcard-icon">{g.icono}</div>
              <h3>{g.nombre}</h3>
              <span className="skill-chip">{g.habilidad}</span>
              <p className="gcard-desc">{g.descripcion}</p>
              <div className="gcard-meta">
                <span title="Mejor marca">🏅 {st ? st.best : 0}</span>
                <span title="Nivel">{'★'.repeat(st ? st.level : 1)}</span>
                <span title="Partidas jugadas">🎮 {st ? st.plays : 0}</span>
              </div>
              <button className="btn-primary btn-block" onClick={() => onPlay(g.id)}>
                Jugar
              </button>
            </article>
          );
        })}
      </div>

      <footer className="foot muted">
        MEMORA · Tus datos se guardan solo en este dispositivo · Hecho con 🧠
      </footer>
    </div>
  );
}
