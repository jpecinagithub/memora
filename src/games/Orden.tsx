import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, pickDistinct, shuffle, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const POOL = [
  '🍎', '🚗', '🐶', '🌙', '⚽', '🎸', '🌵', '🍩',
  '🚀', '🐠', '🎈', '📚', '🍕', '🐢', '🌈', '⛺',
  '🎩', '🍇', '🚲', '🐝', '🌻', '🎮', '🍦', '🐙',
];
const ROUNDS = 5;

export default function Orden({ level, paused, onFinish }: GameProps) {
  const count = 5 + (Math.min(3, Math.max(1, level)) - 1) * 2; // 5 / 7 / 9
  const [phase, setPhase] = useState<'show' | 'recall'>('show');
  const [tiles, setTiles] = useState<string[]>([]);
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [showIdx, setShowIdx] = useState(-1);
  const [picked, setPicked] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const picksRef = useRef<string[]>([]);
  const gateRef = useRef<ReturnType<typeof createGate<string[]>> | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    cancelRef.current = false;
    let scoreLocal = 0;
    let totalCorrect = 0;
    let totalPos = 0;
    (async () => {
      for (let r = 0; r < ROUNDS; r++) {
        if (cancelRef.current) return;
        const original = pickDistinct(POOL, count);
        picksRef.current = [];
        setTiles(original);
        setPicked([]);
        setRound(r + 1);
        setFlash(null);
        setPhase('show');
        try {
          await sleepPausable(600, pausedRef, cancelRef);
        } catch {
          return;
        }
        for (let i = 0; i < original.length; i++) {
          if (cancelRef.current) return;
          setShowIdx(i);
          sfx.tick();
          try {
            await sleepPausable(900, pausedRef, cancelRef);
          } catch {
            setShowIdx(-1);
            return;
          }
        }
        setShowIdx(-1);
        if (cancelRef.current) return;
        setShuffled(shuffle(original));
        setPhase('recall');
        const gate = createGate<string[]>();
        gateRef.current = gate;
        let got: string[] = [];
        try {
          got = await gate.wait();
        } catch {
          return;
        }
        const correct = got.filter((e, i) => e === original[i]).length;
        totalCorrect += correct;
        totalPos += original.length;
        scoreLocal += correct * 25;
        setFlash(correct === original.length ? 'ok' : 'bad');
        if (correct === original.length) sfx.acierto();
        else sfx.fallo();
        try {
          await sleepPausable(900, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const levelUp = totalPos > 0 && totalCorrect / totalPos >= 0.8;
      const fin = finishRef.current;
      setTimeout(
        () =>
          fin(
            scoreLocal,
            levelUp,
            `${totalCorrect}/${totalPos} posiciones correctas en ${ROUNDS} rondas`,
          ),
        600,
      );
    })();
    return () => {
      cancelRef.current = true;
      gateRef.current?.cancel();
    };
    // Montaje único por partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (emoji: string) => {
    if (phaseRef.current !== 'recall' || pausedRef.current) return;
    if (picksRef.current.includes(emoji)) return;
    sfx.tick();
    picksRef.current = [...picksRef.current, emoji];
    setPicked(picksRef.current);
    if (picksRef.current.length === count) {
      gateRef.current?.open([...picksRef.current]);
    }
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          Ronda: {round}/{ROUNDS}
        </span>
        <span className="pill">Fichas: {count}</span>
      </div>
      {phase === 'show' ? (
        <>
          <p className="board-hint">Fíjate en el orden…</p>
          <div className="tiles-row">
            {tiles.map((e, i) => (
              <span key={i} className={`tile${showIdx === i ? ' highlight' : ''}`}>
                {e}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="board-hint">Tócalas en el orden original</p>
          <div
            className={`tiles-grid${flash === 'ok' ? ' ok' : ''}${flash === 'bad' ? ' bad' : ''}`}
            data-testid="orden-recall"
            data-answer={tiles.join(',')}
          >
            {shuffled.map((e, i) => (
              <button
                key={i}
                data-testid={`otile-${i}`}
                data-tile={e}
                className={`tile tile-btn${picked.includes(e) ? ' picked' : ''}`}
                onClick={() => tap(e)}
                aria-label={`Ficha ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
