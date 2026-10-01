import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, pickDistinct, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

// Nivel 1: 3x3 · Nivel 2: 4x4 · Nivel 3: 5x5
const SIZES = [3, 4, 5];
const MAX_ROUNDS = 12;

export default function Matriz({ level, paused, onFinish }: GameProps) {
  const size = SIZES[Math.min(SIZES.length - 1, Math.max(0, level - 1))];
  const cells = size * size;

  const [phase, setPhase] = useState<'show' | 'recall'>('show');
  const [pattern, setPattern] = useState<number[]>([]);
  const [lit, setLit] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [k, setK] = useState(3);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const patternRef = useRef<number[]>([]);
  const picksRef = useRef<number[]>([]);
  const gateRef = useRef<ReturnType<typeof createGate<number[]>> | null>(null);

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
    let kLocal = 3;
    let livesLocal = 3;
    let totalK = 0;
    let maxK = 3;
    (async () => {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        if (cancelRef.current) return;
        const pat = pickDistinct(
          Array.from({ length: cells }, (_, i) => i),
          Math.min(kLocal, cells),
        );
        patternRef.current = pat;
        picksRef.current = [];
        setPattern(pat);
        setPicks([]);
        setFlash(null);
        setPhase('show');
        setLit(true);
        try {
          await sleepPausable(2200, pausedRef, cancelRef);
        } catch {
          return;
        }
        if (cancelRef.current) return;
        setLit(false);
        setPhase('recall');
        const gate = createGate<number[]>();
        gateRef.current = gate;
        let got: number[];
        try {
          got = await gate.wait();
        } catch {
          return;
        }
        const need = patternRef.current.length;
        const ok =
          got.length === need &&
          new Set(got).size === need &&
          got.every((p) => patternRef.current.includes(p));
        if (ok) {
          totalK += need;
          maxK = Math.max(maxK, need);
          setFlash('ok');
          sfx.acierto();
          kLocal += 1;
          setK(kLocal);
        } else {
          livesLocal -= 1;
          setLives(livesLocal);
          setFlash('bad');
          sfx.fallo();
          if (livesLocal <= 0) break;
        }
        try {
          await sleepPausable(800, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const score = totalK + livesLocal * 50;
      const levelUp = maxK >= 6 + level;
      const fin = finishRef.current;
      setTimeout(
        () => fin(score, levelUp, `Patrón máximo: ${maxK} casillas · ${livesLocal} vidas restantes`),
        600,
      );
    })();
    return () => {
      cancelRef.current = true;
      gateRef.current?.cancel();
    };
    // El juego se monta de nuevo en cada partida: level/cells quedan fijados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (i: number) => {
    if (phaseRef.current !== 'recall' || pausedRef.current) return;
    if (picksRef.current.includes(i)) return;
    sfx.tick();
    picksRef.current = [...picksRef.current, i];
    setPicks(picksRef.current);
    if (
      picksRef.current.length === patternRef.current.length &&
      patternRef.current.length > 0
    ) {
      gateRef.current?.open([...picksRef.current]);
    }
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">Casillas: {k}</span>
        <span className="pill">
          Vidas: {'❤️'.repeat(lives)}
          {'🤍'.repeat(Math.max(0, 3 - lives))}
        </span>
      </div>
      <p className="board-hint">
        {phase === 'show' ? 'Memoriza el patrón…' : 'Toca las casillas del patrón'}
      </p>
      <div
        className="matrix-grid"
        data-testid="matrix-grid"
        data-pattern={pattern.join(',')}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {Array.from({ length: cells }, (_, i) => {
          const isLit = lit && pattern.includes(i);
          const isPicked = picks.includes(i);
          const cls =
            'mcell' +
            (isLit ? ' lit' : '') +
            (isPicked ? ' picked' : '') +
            (flash === 'ok' && phase === 'recall' ? ' ok' : '') +
            (flash === 'bad' && phase === 'recall' ? ' bad' : '');
          return (
            <button
              key={i}
              data-testid={`mcell-${i}`}
              data-lit={isLit ? 'true' : undefined}
              className={cls}
              onClick={() => tap(i)}
              aria-label={`Casilla ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
