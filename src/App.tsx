import { useState, type ComponentType } from 'react';
import Home from './components/Home';
import GameIntro from './components/GameIntro';
import GameShell from './components/GameShell';
import GameResult from './components/GameResult';
import { getGame } from './data/games';
import { actions, todayKey, useMemoraStore, workoutFor } from './state/store';
import Parejas from './games/Parejas';
import Matriz from './games/Matriz';
import Eco from './games/Eco';
import Doble from './games/Doble';
import Digitos from './games/Digitos';
import Intruso from './games/Intruso';
import Orden from './games/Orden';
import Vistazo from './games/Vistazo';
import Camino from './games/Camino';
import type { GameProps } from './games/types';

const GAME_COMPONENTS: Record<string, ComponentType<GameProps>> = {
  parejas: Parejas,
  matriz: Matriz,
  eco: Eco,
  doble: Doble,
  digitos: Digitos,
  intruso: Intruso,
  orden: Orden,
  vistazo: Vistazo,
  camino: Camino,
};

type View =
  | { name: 'home' }
  | { name: 'intro'; gameId: string }
  | { name: 'play'; gameId: string; queue?: string[] }
  | {
      name: 'result';
      gameId: string;
      score: number;
      isRecord: boolean;
      xpEarned: number;
      levelUp: boolean;
      detail?: string;
      queue?: string[];
      workoutComplete?: boolean;
    };

export default function App() {
  const s = useMemoraStore();
  const [view, setView] = useState<View>({ name: 'home' });
  const goHome = () => setView({ name: 'home' });

  if (view.name === 'home') {
    return (
      <div className="app">
        <Home
          onPlay={(gameId) => setView({ name: 'intro', gameId })}
          onStartWorkout={() => {
            const ids = workoutFor(new Date());
            setView({ name: 'play', gameId: ids[0], queue: ids });
          }}
        />
      </div>
    );
  }

  if (view.name === 'intro') {
    const game = getGame(view.gameId);
    return (
      <div className="app">
        <GameIntro
          game={game}
          onStart={() => setView({ name: 'play', gameId: view.gameId })}
          onBack={goHome}
        />
      </div>
    );
  }

  if (view.name === 'play') {
    const game = getGame(view.gameId);
    const Comp = GAME_COMPONENTS[view.gameId];
    const st = s.games[view.gameId];
    const queue = view.queue;
    const gameId = view.gameId;
    return (
      <div className="app">
        <GameShell game={game} onExit={goHome}>
          {({ paused }) => (
            <Comp
              level={st ? st.level : 1}
              paused={paused}
              onFinish={(score, levelUp, detail) => {
                const { isRecord, xpEarned } = actions.recordSession(gameId, score, levelUp);
                let workoutComplete = false;
                if (queue && queue[queue.length - 1] === gameId) {
                  actions.completeWorkoutDay(todayKey(), queue);
                  workoutComplete = true;
                }
                setView({
                  name: 'result',
                  gameId,
                  score,
                  isRecord,
                  xpEarned,
                  levelUp,
                  detail,
                  queue,
                  workoutComplete,
                });
              }}
            />
          )}
        </GameShell>
      </div>
    );
  }

  const game = getGame(view.gameId);
  const st = s.games[view.gameId];
  const queue = view.queue;
  let nextId: string | undefined;
  if (queue) {
    const i = queue.indexOf(view.gameId);
    if (i >= 0 && i < queue.length - 1) nextId = queue[i + 1];
  }
  const nextGame = nextId ? getGame(nextId) : undefined;

  return (
    <div className="app">
      <GameResult
        game={game}
        score={view.score}
        best={st ? st.best : view.score}
        isRecord={view.isRecord}
        xpEarned={view.xpEarned + (view.workoutComplete ? 50 : 0)}
        levelUp={view.levelUp}
        detail={view.detail}
        workoutComplete={view.workoutComplete}
        nextLabel={nextGame ? `Siguiente juego: ${nextGame.nombre} →` : undefined}
        onNext={nextId ? () => setView({ name: 'play', gameId: nextId, queue }) : undefined}
        onReplay={() => setView({ name: 'play', gameId: view.gameId, queue })}
        onHome={goHome}
      />
    </div>
  );
}
