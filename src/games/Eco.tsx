import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const PADS = [
  { color: '#FF6B6B', label: 'Rojo' },
  { color: '#4DABF7', label: 'Azul' },
  { color: '#69DB7C', label: 'Verde' },
  { color: '#FFD43B', label: 'Amarillo' },
];
const MAX_ROUNDS = 12;

export default function Eco({ level, paused, onFinish }: GameProps) {
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [seq, setSeq] = useState<number[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(1);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const seqRef = useRef<number[]>([]);
  const progressRef = useRef(0);
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
    const step = level >= 3 ? 450 : level === 2 ? 550 : 650;
    let livesLocal = 3;
    let roundsOk = 0;
    let bestStreak = 0;
    const seqLocal: number[] = [];
    (async () => {
      for (let r = 0; r < MAX_ROUNDS; r++) {
        if (cancelRef.current) return;
        seqLocal.push(Math.floor(Math.random() * 4));
        seqRef.current = [...seqLocal];
        setSeq([...seqLocal]);
        setRound(r + 1);
        setFlash(null);
        // Mostrar secuencia
        setPhase('show');
        try {
          await sleepPausable(600, pausedRef, cancelRef);
        } catch {
          return;
        }
        for (const s of seqLocal) {
          if (cancelRef.current) return;
          setActive(s);
          sfx.pad(s);
          try {
            await sleepPausable(step, pausedRef, cancelRef);
          } catch {
            setActive(null);
            return;
          }
          setActive(null);
          try {
            await sleepPausable(Math.min(220, step / 2), pausedRef, cancelRef);
          } catch {
            return;
          }
        }
        // Entrada del jugador
        progressRef.current = 0;
        setPhase('input');
        const gate = createGate<boolean>();
        gateRef.current = gate;
        let ok = false;
        try {
          ok = await gate.wait();
        } catch {
          return;
        }
        if (ok) {
          roundsOk += 1;
          bestStreak = Math.max(bestStreak, seqLocal.length);
          setFlash('ok');
          sfx.acierto();
        } else {
          livesLocal -= 1;
          setLives(livesLocal);
          setFlash('bad');
          sfx.fallo();
          seqLocal.pop(); // se repite la misma secuencia
          seqRef.current = [...seqLocal];
          setSeq([...seqLocal]);
          if (livesLocal <= 0) break;
        }
        try {
          await sleepPausable(800, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const score = bestStreak * 50 + roundsOk * 25;
      const levelUp = bestStreak >= 5 + level;
      const fin = finishRef.current;
      setTimeout(
        () =>
          fin(
            score,
            levelUp,
            `Mejor racha: ${bestStreak} pasos · ${roundsOk} rondas superadas`,
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

  const tap = (i: number) => {
    if (phaseRef.current !== 'input' || pausedRef.current) return;
    setActive(i);
    sfx.pad(i);
    setTimeout(() => setActive(null), 220);
    const expected = seqRef.current[progressRef.current];
    if (i !== expected) {
      gateRef.current?.open(false);
      return;
    }
    progressRef.current += 1;
    if (progressRef.current >= seqRef.current.length) {
      gateRef.current?.open(true);
    }
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">Ronda: {round}</span>
        <span className="pill">Pasos: {seq.length}</span>
        <span className="pill">
          Vidas: {'❤️'.repeat(lives)}
          {'🤍'.repeat(Math.max(0, 3 - lives))}
        </span>
      </div>
      <p className="board-hint">
        {phase === 'show' ? 'Observa y escucha…' : 'Repite la secuencia tocando'}
      </p>
      <div
        className={`eco-board${flash === 'ok' ? ' ok' : ''}${flash === 'bad' ? ' bad' : ''}`}
        data-testid="eco-board"
        data-seq={seq.join(',')}
      >
        {PADS.map((p, i) => (
          <button
            key={i}
            data-testid={`pad-${i}`}
            className={`epad${active === i ? ' active' : ''}`}
            style={{ ['--pad' as string]: p.color }}
            onClick={() => tap(i)}
            aria-label={`Botón ${p.label}`}
          />
        ))}
      </div>
    </div>
  );
}
