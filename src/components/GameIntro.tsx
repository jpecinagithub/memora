import type { GameDef } from '../data/games';
import { useMemoraStore } from '../state/store';

interface Props {
  game: GameDef;
  onStart: () => void;
  onBack: () => void;
  workoutTag?: string; // p. ej. "Juego 1 de 3 · Entrenamiento de hoy"
}

export default function GameIntro({ game, onStart, onBack, workoutTag }: Props) {
  const s = useMemoraStore();
  const st = s.games[game.id];

  return (
    <div
      className="intro"
      data-testid="game-intro"
      style={{ ['--accent' as string]: game.color }}
    >
      <button className="btn-ghost intro-back" onClick={onBack}>
        ← Volver
      </button>
      {workoutTag && <div className="workout-tag">{workoutTag}</div>}
      <div className="intro-icon">{game.icono}</div>
      <h1>{game.nombre}</h1>
      <p className="intro-meta">
        <span className="skill-chip">{game.habilidad}</span>
        <span className="muted">· {game.duracion}</span>
      </p>
      <p className="intro-desc">{game.descripcion}</p>

      <div className="how-card">
        <h3>Cómo jugar</h3>
        <ul>
          {game.comoJugar.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="intro-stats">
        <div className="stat">
          <span className="stat-val">{st ? st.best : 0}</span>
          <span className="stat-label">Mejor marca</span>
        </div>
        <div className="stat">
          <span className="stat-val">{'★'.repeat(st ? st.level : 1)}</span>
          <span className="stat-label">Nivel</span>
        </div>
        <div className="stat">
          <span className="stat-val">{st ? st.plays : 0}</span>
          <span className="stat-label">Partidas</span>
        </div>
      </div>

      <button className="btn-primary btn-big" data-testid="start-btn" onClick={onStart}>
        Empezar
      </button>
    </div>
  );
}
