import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const ROUNDS = 6;

export default function Digitos({ level, paused, onFinish }: GameProps) {
  const [digits, setDigits] = useState<number[]>([]);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [entered, setEntered] = useState('');
  const [len, setLen] = useState(4);
  const [round, setRound] = useState(1);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const digitsRef = useRef<number[]>([]);
  const enteredRef = useRef('');
  const gateRef = useRef<ReturnType<typeof createGate<string>> | null>(null);

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
    let l = 4;
    let maxL = 4;
    let ok = 0;
    (async () => {
      for (let r = 0; r < ROUNDS; r++) {
        if (cancelRef.current) return;
        const dg = Array.from({ length: l }, () => Math.floor(Math.random() * 10));
        digitsRef.current = dg;
        enteredRef.current = '';
        setDigits(dg);
        setEntered('');
        setShown(0);
        setLen(l);
        setRound(r + 1);
        setFeedback(null);
        setPhase('show');
        const step = l > 7 ? 700 : 900;
        for (let i = 0; i < l; i++) {
          try {
            await sleepPausable(step, pausedRef, cancelRef);
          } catch {
            return;
          }
          if (cancelRef.current) return;
          setShown(i + 1);
        }
        try {
          await sleepPausable(400, pausedRef, cancelRef);
        } catch {
          return;
        }
        if (cancelRef.current) return;
        setPhase('input');
        const gate = createGate<string>();
        gateRef.current = gate;
        let answer = '';
        try {
          answer = await gate.wait();
        } catch {
          return;
        }
        if (answer === dg.join('')) {
          ok += 1;
          maxL = Math.max(maxL, l);
          l += 1;
          setFeedback('ok');
          sfx.acierto();
        } else {
          l = Math.max(3, l - 1);
          setFeedback('bad');
          sfx.fallo();
        }
        try {
          await sleepPausable(900, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const score = maxL * 120 + ok * 40;
      const levelUp = maxL >= 4 + level * 2;
      const fin = finishRef.current;
      setTimeout(
        () => fin(score, levelUp, `Cifra máxima: ${maxL} dígitos · ${ok}/${ROUNDS} rondas`),
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

  const pressKey = (d: string) => {
    if (phaseRef.current !== 'input' || pausedRef.current) return;
    if (d === 'back') {
      enteredRef.current = enteredRef.current.slice(0, -1);
      setEntered(enteredRef.current);
      return;
    }
    const target = digitsRef.current.length;
    if (enteredRef.current.length >= target) return;
    sfx.tick();
    enteredRef.current += d;
    setEntered(enteredRef.current);
    if (enteredRef.current.length === target) {
      const gate = gateRef.current;
      const val = enteredRef.current;
      setTimeout(() => gate?.open(val), 250);
    }
  };

  const display =
    phase === 'show'
      ? digits
          .map((d, i) => (i < shown ? String(d) : '•'))
          .join(' ')
      : entered.padEnd(digits.length, '_').split('').join(' ');

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          Ronda: {round}/{ROUNDS}
        </span>
        <span className="pill">Dígitos: {len}</span>
      </div>
      <p className="board-hint">
        {phase === 'show' ? 'Memoriza los dígitos…' : 'Escríbelos en orden'}
      </p>
      <div
        className={`digitos-display${feedback === 'ok' ? ' ok' : ''}${feedback === 'bad' ? ' bad' : ''}`}
        data-testid="digit-display"
        data-digits={digits.join('')}
        data-phase={phase}
      >
        {display || '···'}
      </div>
      <div className="numpad" data-testid="numpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} data-testid={`dkey-${d}`} className="nkey" onClick={() => pressKey(d)}>
            {d}
          </button>
        ))}
        <span />
        <button data-testid="dkey-0" className="nkey" onClick={() => pressKey('0')}>
          0
        </button>
        <button data-testid="dkey-back" className="nkey nkey-back" onClick={() => pressKey('back')} aria-label="Borrar">
          ⌫
        </button>
      </div>
    </div>
  );
}
