import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { createGate, pickDistinct, shuffle, sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const POOL = [
  '🍎', '🚗', '🐶', '🌙', '⚽', '🎸', '🌵', '🍩',
  '🚀', '🐠', '🎈', '📚', '🍕', '🐢', '🌈', '⛺',
  '🎩', '🍇', '🚲', '🐝', '🌻', '🎮', '🍦', '🐙',
  '🏠', '⭐', '🍉', '🎯', '🎲', '🪁', '🦄', '🐬',
];
const ROUNDS = 4;
const TARGETS = 8;
const OPTIONS = 12;

export default function Vistazo({ level, paused, onFinish }: GameProps) {
  void level;
  const [phase, setPhase] = useState<'mem' | 'find'>('mem');
  const [targets, setTargets] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const finishRef = useRef(onFinish);
  const phaseRef = useRef(phase);
  const selectedRef = useRef<number[]>([]);
  const answersRef = useRef<number[]>([]);
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
    let scoreLocal = 0;
    let totalCorrect = 0;
    (async () => {
      for (let r = 0; r < ROUNDS; r++) {
        if (cancelRef.current) return;
        const tg = pickDistinct(POOL, TARGETS);
        const rest = POOL.filter((e) => !tg.includes(e));
        const opts = shuffle([...tg, ...pickDistinct(rest, OPTIONS - TARGETS)]);
        const ans = opts
          .map((e, i) => (tg.includes(e) ? i : -1))
          .filter((i) => i >= 0);
        answersRef.current = ans;
        selectedRef.current = [];
        setTargets(tg);
        setOptions(opts);
        setAnswers(ans);
        setSelected([]);
        setRound(r + 1);
        setFlash(null);
        setPhase('mem');
        try {
          await sleepPausable(6000, pausedRef, cancelRef);
        } catch {
          return;
        }
        if (cancelRef.current) return;
        setPhase('find');
        const gate = createGate<boolean>();
        gateRef.current = gate;
        try {
          await gate.wait();
        } catch {
          return;
        }
        const sel = selectedRef.current;
        const correct = sel.filter((i) => answersRef.current.includes(i)).length;
        const wrong = sel.filter((i) => !answersRef.current.includes(i)).length;
        const roundScore = Math.max(0, correct * 25 - wrong * 25);
        scoreLocal += roundScore;
        totalCorrect += correct;
        setFlash(wrong === 0 && correct === TARGETS ? 'ok' : 'bad');
        if (wrong === 0 && correct === TARGETS) sfx.acierto();
        else sfx.fallo();
        try {
          await sleepPausable(1000, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      const precision = totalCorrect / (ROUNDS * TARGETS);
      const levelUp = precision >= 0.85;
      const fin = finishRef.current;
      setTimeout(
        () =>
          fin(
            scoreLocal,
            levelUp,
            `Precisión: ${Math.round(precision * 100)}% · ${totalCorrect}/${ROUNDS * TARGETS} elementos`,
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

  const toggle = (i: number) => {
    if (phaseRef.current !== 'find' || pausedRef.current) return;
    const cur = selectedRef.current;
    if (cur.includes(i)) {
      selectedRef.current = cur.filter((x) => x !== i);
    } else {
      if (cur.length >= TARGETS) return;
      selectedRef.current = [...cur, i];
      sfx.tick();
    }
    setSelected(selectedRef.current);
  };

  const check = () => {
    if (phaseRef.current !== 'find' || pausedRef.current) return;
    if (selectedRef.current.length === 0) return;
    gateRef.current?.open(true);
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          Ronda: {round}/{ROUNDS}
        </span>
        {phase === 'find' && (
          <span className="pill">
            Seleccionados: {selected.length}/{TARGETS}
          </span>
        )}
      </div>
      {phase === 'mem' ? (
        <>
          <p className="board-hint">Memoriza estos {TARGETS}…</p>
          <div className="emoji-grid" data-testid="vistazo-mem">
            {targets.map((e, i) => (
              <span key={i} className="emoji-cell">
                {e}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="board-hint">Marca los {TARGETS} que ya viste</p>
          <div
            className={`emoji-grid${flash === 'ok' ? ' ok' : ''}${flash === 'bad' ? ' bad' : ''}`}
            data-testid="vistazo-grid"
            data-answers={answers.join(',')}
          >
            {options.map((e, i) => (
              <button
                key={i}
                data-testid={`vcell-${i}`}
                className={`emoji-cell emoji-btn${selected.includes(i) ? ' selected' : ''}`}
                onClick={() => toggle(i)}
                aria-label={`Elemento ${i + 1}`}
                aria-pressed={selected.includes(i)}
              >
                {e}
              </button>
            ))}
          </div>
          <button className="btn-primary btn-big" data-testid="check-btn" onClick={check}>
            Comprobar
          </button>
        </>
      )}
    </div>
  );
}
