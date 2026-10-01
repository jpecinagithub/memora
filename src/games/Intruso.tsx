import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, pickDistinct, shuffle, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const POOL = [
  '🍎', '🚗', '🐶', '🌙', '⚽', '🎸', '🌵', '🍩',
  '🚀', '🐠', '🎈', '📚', '🍕', '🐢', '🌈', '⛺',
  '🎩', '🍇', '🚲', '🐝', '🌻', '🎮', '🍦', '🐙',
  '🏠', '⭐', '🍉', '🎯', '🎲', '🪁',
];
const ROUNDS = 8;

export default function Intruso({ level, paused, onFinish }: GameProps) {
  const count = level === 1 ? 6 : level === 2 ? 8 : 10;
  const [phase, setPhase] = useState<'mem' | 'find'>('mem');
  const [group, setGroup] = useState<string[]>([]);
  const [display, setDisplay] = useState<string[]>([]);
  const [newIdx, setNewIdx] = useState(-1);
  const [round, setRound] = useState(1);
  const [hits, setHits] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const newIdxRef = useRef(-1);
  const gateRef = useRef<ReturnType<typeof createGate<number>> | null>(null);

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
    let hitsLocal = 0;
    let bonusTotal = 0;
    (async () => {
      for (let r = 0; r < ROUNDS; r++) {
        if (cancelRef.current) return;
        const g = pickDistinct(POOL, count);
        const rest = POOL.filter((e) => !g.includes(e));
        const fresh = pickDistinct(rest, 1)[0];
        const disp = shuffle([...g, fresh]);
        const ni = disp.indexOf(fresh);
        newIdxRef.current = ni;
        setGroup(g);
        setDisplay(disp);
        setNewIdx(ni);
        setRound(r + 1);
        setFlash(null);
        setPhase('mem');
        try {
          await sleepPausable(4000, pausedRef, cancelRef);
        } catch {
          return;
        }
        if (cancelRef.current) return;
        setPhase('find');
        const t0 = Date.now();
        const gate = createGate<number>();
        gateRef.current = gate;
        let tapped = -1;
        try {
          tapped = await gate.wait();
        } catch {
          return;
        }
        const secs = (Date.now() - t0) / 1000;
        if (tapped === newIdxRef.current) {
          hitsLocal += 1;
          setHits(hitsLocal);
          bonusTotal += Math.max(0, Math.round(200 - secs * 15));
          setFlash('ok');
          sfx.acierto();
        } else {
          setFlash('bad');
          sfx.fallo();
        }
        try {
          await sleepPausable(900, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const score = hitsLocal * 100 + bonusTotal;
      const levelUp = hitsLocal >= 7;
      const fin = finishRef.current;
      setTimeout(
        () => fin(score, levelUp, `${hitsLocal}/${ROUNDS} intrusos encontrados`),
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

  const tap = (i: number) => {
    if (phaseRef.current !== 'find' || pausedRef.current) return;
    sfx.tick();
    gateRef.current?.open(i);
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          Ronda: {round}/{ROUNDS}
        </span>
        <span className="pill">Aciertos: {hits}</span>
      </div>
      {phase === 'mem' ? (
        <>
          <p className="board-hint">Memoriza este grupo…</p>
          <div className="emoji-grid" data-testid="intruso-mem">
            {group.map((e, i) => (
              <span key={i} className="emoji-cell">
                {e}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="board-hint">¡Hay un intruso! Tócalo 👆</p>
          <div
            className={`emoji-grid${flash === 'ok' ? ' ok' : ''}${flash === 'bad' ? ' bad' : ''}`}
            data-testid="intruso-find"
            data-new={newIdx}
          >
            {display.map((e, i) => (
              <button
                key={i}
                data-testid={`icell-${i}`}
                className="emoji-cell emoji-btn"
                onClick={() => tap(i)}
                aria-label={`Elemento ${i + 1}`}
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
