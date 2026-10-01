import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { sleepPausable } from '../lib/timing';
import type { GameProps } from './types';

const SYMBOLS = ['✦', '●', '▲', '■', '⬟', '✚', '◈', '⬢'];
const N = 24; // estímulos por sesión
const GAP_MS = 350;

export default function Doble({ level, paused, onFinish }: GameProps) {
  const SHOW_MS = 1500 - level * 150; // más rápido en niveles altos
  const [seq] = useState<number[]>(() =>
    Array.from({ length: N }, () => Math.floor(Math.random() * SYMBOLS.length)),
  );
  const [idx, setIdx] = useState(-1);
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null);
  const [hits, setHits] = useState(0);
  const [fas, setFas] = useState(0);

  const pausedRef = useRef(paused);
  const cancelRef = useRef(false);
  const doneRef = useRef(false);
  const finishRef = useRef(onFinish);
  const idxRef = useRef(-1);
  const seqRef = useRef(seq);
  const shownAtRef = useRef(0);
  const statsRef = useRef({
    hits: 0,
    fa: 0,
    reacted: new Set<number>(),
    reactions: [] as number[],
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  const press = useCallback(() => {
    const i = idxRef.current;
    if (doneRef.current || i < 0 || pausedRef.current) return;
    const st = statsRef.current;
    if (st.reacted.has(i)) return;
    st.reacted.add(i);
    const target = i >= 2 && seqRef.current[i] === seqRef.current[i - 2];
    if (target) {
      st.hits += 1;
      st.reactions.push(Date.now() - shownAtRef.current);
      setHits(st.hits);
      setFlash('hit');
      sfx.acierto();
    } else {
      st.fa += 1;
      setFas(st.fa);
      setFlash('miss');
      sfx.fallo();
    }
    setTimeout(() => setFlash(null), 350);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        press();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [press]);

  useEffect(() => {
    cancelRef.current = false;
    (async () => {
      for (let i = 0; i < N; i++) {
        if (cancelRef.current) return;
        idxRef.current = i;
        shownAtRef.current = Date.now();
        setIdx(i);
        try {
          await sleepPausable(SHOW_MS, pausedRef, cancelRef);
        } catch {
          return;
        }
        idxRef.current = -1;
        setIdx(-1);
        try {
          await sleepPausable(GAP_MS, pausedRef, cancelRef);
        } catch {
          return;
        }
      }
      if (doneRef.current) return;
      doneRef.current = true;
      const st = statsRef.current;
      const avg = st.reactions.length
        ? st.reactions.reduce((a, b) => a + b, 0) / st.reactions.length
        : 0;
      const speedBonus =
        st.hits > 0 ? Math.max(0, Math.min(500, Math.round(600 - avg / 3))) : 0;
      const score = Math.max(0, st.hits * 100 - st.fa * 60 + speedBonus);
      const targets = seqRef.current.filter(
        (v, j) => j >= 2 && v === seqRef.current[j - 2],
      ).length;
      const levelUp = targets > 0 && st.hits / targets >= 0.7;
      const fin = finishRef.current;
      setTimeout(
        () =>
          fin(
            score,
            levelUp,
            `${st.hits}/${targets} aciertos · ${st.fa} falsas alarmas · bonus velocidad ${speedBonus}`,
          ),
        600,
      );
    })();
    return () => {
      cancelRef.current = true;
    };
    // Montaje único por partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          {Math.max(0, idx + 1)}/{N}
        </span>
        <span className="pill">✅ {hits}</span>
        <span className="pill">❌ {fas}</span>
      </div>
      <p className="board-hint">¿Es igual al de hace 2 turnos?</p>
      <div
        className={`doble-stage${flash === 'hit' ? ' hit' : ''}${flash === 'miss' ? ' miss' : ''}`}
        data-testid="doble-board"
        data-seq={seq.join(',')}
      >
        <div className="doble-symbol" data-testid="stimulus" data-idx={idx}>
          {idx >= 0 ? SYMBOLS[seq[idx]] : '·'}
        </div>
      </div>
      <button className="btn-primary btn-big" data-testid="same-btn" onClick={press}>
        ¡Igual!
      </button>
      <p className="muted small">o pulsa la tecla Espacio</p>
    </div>
  );
}
