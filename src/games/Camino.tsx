import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const SIZE = 5;
const CELLS = SIZE * SIZE;
const MAX_ROUNDS = 12;

function genPath(k: number): number[] {
  for (let attempt = 0; attempt < 60; attempt++) {
    const path: number[] = [];
    const used = new Set<number>();
    let cur = Math.floor(Math.random() * CELLS);
    path.push(cur);
    used.add(cur);
    let ok = true;
    for (let s = 1; s < k; s++) {
      const r = Math.floor(cur / SIZE);
      const c = cur % SIZE;
      const nbs: number[] = [];
      if (r > 0) nbs.push((r - 1) * SIZE + c);
      if (r < SIZE - 1) nbs.push((r + 1) * SIZE + c);
      if (c > 0) nbs.push(r * SIZE + (c - 1));
      if (c < SIZE - 1) nbs.push(r * SIZE + (c + 1));
      const free = nbs.filter((n) => !used.has(n));
      if (free.length === 0) {
        ok = false;
        break;
      }
      cur = free[Math.floor(Math.random() * free.length)];
      path.push(cur);
      used.add(cur);
    }
    if (ok) return path;
  }
  return Array.from({ length: k }, (_, i) => i % CELLS);
}

export default function Camino({ level, paused, onFinish }: GameProps) {
  const [phase, setPhase] = useState<'show' | 'recall'>('show');
  const [path, setPath] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [stepped, setStepped] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [k, setK] = useState(4);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const pathRef = useRef<number[]>([]);
  const progressRef = useRef(0);
  const steppedRef = useRef<number[]>([]);
  const gateRef = useRef<ReturnType<typeof createGate<boolean>> | null>(null);

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
    let kLocal = 4;
    let livesLocal = 3;
    let totalK = 0;
    let maxK = 4;
    (async () => {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        if (cancelRef.current) return;
        const p = genPath(kLocal);
        pathRef.current = p;
        progressRef.current = 0;
        steppedRef.current = [];
        setPath(p);
        setStepped([]);
        setFlash(null);
        setPhase('show');
        try {
          await sleepPausable(600, pausedRef, cancelRef);
        } catch {
          return;
        }
        for (const cell of p) {
          if (cancelRef.current) return;
          setActive(cell);
          sfx.tick();
          try {
            await sleepPausable(650, pausedRef, cancelRef);
          } catch {
            setActive(null);
            return;
          }
          setActive(null);
          try {
            await sleepPausable(120, pausedRef, cancelRef);
          } catch {
            return;
          }
        }
        if (cancelRef.current) return;
        setPhase('recall');
        const gate = createGate<boolean>();
        gateRef.current = gate;
        let ok = false;
        try {
          ok = await gate.wait();
        } catch {
          return;
        }
        if (ok) {
          totalK += kLocal;
          maxK = Math.max(maxK, kLocal);
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
        () => fin(score, levelUp, `Camino máximo: ${maxK} pasos · ${livesLocal} vidas restantes`),
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
    if (phaseRef.current !== 'recall' || pausedRef.current) return;
    const expected = pathRef.current[progressRef.current];
    if (i !== expected) {
      gateRef.current?.open(false);
      return;
    }
    sfx.tick();
    progressRef.current += 1;
    steppedRef.current = [...steppedRef.current, i];
    setStepped(steppedRef.current);
    if (progressRef.current >= pathRef.current.length) {
      gateRef.current?.open(true);
    }
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">Pasos: {k}</span>
        <span className="pill">
          Vidas: {'❤️'.repeat(lives)}
          {'🤍'.repeat(Math.max(0, 3 - lives))}
        </span>
      </div>
      <p className="board-hint">
        {phase === 'show' ? 'Sigue el camino con la mirada…' : 'Recorre el camino en orden'}
      </p>
      <div
        className={`camino-grid${flash === 'ok' ? ' ok' : ''}${flash === 'bad' ? ' bad' : ''}`}
        data-testid="camino-grid"
        data-path={path.join(',')}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const stepNum = stepped.indexOf(i);
          const cls =
            'ccell' +
            (active === i ? ' lit' : '') +
            (stepNum >= 0 ? ' stepped' : '') +
            (path.includes(i) && phase === 'recall' && stepNum < 0 ? ' pending' : '');
          return (
            <button
              key={i}
              data-testid={`ccell-${i}`}
              className={cls}
              onClick={() => tap(i)}
              aria-label={`Casilla ${i + 1}`}
            >
              {stepNum >= 0 ? stepNum + 1 : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
