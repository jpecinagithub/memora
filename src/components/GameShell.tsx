import { useCallback, useState, type ReactNode } from 'react';
import type { GameDef } from '../data/games';
import Countdown from './Countdown';

interface Props {
  game: GameDef;
  onExit: () => void;
  children: (ctx: { paused: boolean }) => ReactNode;
}

// Marco común: cuenta atrás 3-2-1, botón de pausa con overlay y salida.
export default function GameShell({ game, onExit, children }: Props) {
  const [phase, setPhase] = useState<'count' | 'play' | 'paused'>('count');
  const done = useCallback(() => setPhase('play'), []);

  return (
    <div className="game-shell" style={{ ['--accent' as string]: game.color }}>
      <header className="game-topbar">
        <button className="icon-btn" onClick={onExit} aria-label="Salir del juego">
          ✕
        </button>
        <div className="game-title">
          <span className="game-title-icon">{game.icono}</span> {game.nombre}
        </div>
        {phase === 'play' ? (
          <button className="icon-btn" onClick={() => setPhase('paused')} aria-label="Pausar">
            ⏸
          </button>
        ) : (
          <span className="icon-btn ghost" aria-hidden="true" />
        )}
      </header>

      {phase === 'count' && <Countdown onDone={done} />}

      {(phase === 'play' || phase === 'paused') && (
        <div className="game-body">{children({ paused: phase === 'paused' })}</div>
      )}

      {phase === 'paused' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>En pausa</h2>
            <p>Tómate un respiro. El juego te espera.</p>
            <button className="btn-primary" onClick={() => setPhase('play')}>
              Continuar
            </button>
            <button className="btn-ghost" onClick={onExit}>
              Salir del juego
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
