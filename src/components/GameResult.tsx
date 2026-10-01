import { useEffect } from 'react';
import type { GameDef } from '../data/games';
import { sfx } from '../lib/audio';

interface Props {
  game: GameDef;
  score: number;
  best: number;
  isRecord: boolean;
  xpEarned: number;
  levelUp: boolean;
  detail?: string;
  workoutComplete?: boolean;
  nextLabel?: string;
  onNext?: () => void;
  onReplay: () => void;
  onHome: () => void;
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => i);
  const colors = ['#5B5BD6', '#8B5CF6', '#FF6B6B', '#FFD43B', '#69DB7C', '#4DABF7'];
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 12) * 0.12}s`,
            animationDuration: `${1.6 + (i % 5) * 0.25}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function GameResult(props: Props) {
  const {
    game, score, best, isRecord, xpEarned, levelUp, detail,
    workoutComplete, nextLabel, onNext, onReplay, onHome,
  } = props;

  useEffect(() => {
    if (isRecord) sfx.victoria();
    else sfx.acierto();
  }, [isRecord]);

  return (
    <div
      className="result"
      data-testid="game-result"
      style={{ ['--accent' as string]: game.color }}
    >
      {isRecord && <Confetti />}
      <div className="result-icon">{game.icono}</div>
      <h1>{workoutComplete ? '¡Entrenamiento completado!' : '¡Buen trabajo!'}</h1>
      {isRecord && <div className="record-badge">🏆 ¡Nueva mejor marca!</div>}
      {workoutComplete && <div className="workout-done-badge">✅ Día completado · +50 XP</div>}

      <div className="result-score" data-testid="result-score">
        {score}
      </div>
      <div className="muted">puntos</div>
      {detail && <p className="result-detail">{detail}</p>}

      <div className="result-stats">
        <div className="stat">
          <span className="stat-val">{best}</span>
          <span className="stat-label">Mejor marca</span>
        </div>
        <div className="stat">
          <span className="stat-val">+{xpEarned}</span>
          <span className="stat-label">XP ganado</span>
        </div>
        <div className="stat">
          <span className="stat-val">{levelUp ? '⬆️ Nivel' : '—'}</span>
          <span className="stat-label">{levelUp ? '¡Has subido!' : 'Nivel'}</span>
        </div>
      </div>

      <div className="result-actions">
        {onNext && nextLabel && (
          <button className="btn-primary btn-big" data-testid="next-btn" onClick={onNext}>
            {nextLabel}
          </button>
        )}
        <button className="btn-secondary" data-testid="replay-btn" onClick={onReplay}>
          Jugar otra vez
        </button>
        <button className="btn-ghost" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
