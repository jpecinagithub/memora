import { useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/audio';
import { pickDistinct, shuffle } from '../lib/timing';
import type { GameProps } from './types';

const POOL = [
  '🐶', '🐱', '🦊', '🐼', '🦁', '🐸', '🐵', '🐷',
  '🐙', '🦄', '🐝', '🐢', '🦋', '🐬', '🦉', '🐞',
  '🌵', '🍩', '⚽', '🚀', '🎈', '🌈',
];

// Nivel 1: 6 parejas (4x3) · Nivel 2: 8 parejas (4x4) · Nivel 3: 12 parejas (6x4)
const CFG = [
  { pairs: 6, cols: 4 },
  { pairs: 8, cols: 4 },
  { pairs: 12, cols: 6 },
];

interface Card {
  key: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

export default function Parejas({ level, paused, onFinish }: GameProps) {
  const cfg = CFG[Math.min(CFG.length - 1, Math.max(0, level - 1))];
  const [cards, setCards] = useState<Card[]>(() => {
    const emojis = pickDistinct(POOL, cfg.pairs);
    return shuffle([...emojis, ...emojis]).map((emoji, i) => ({
      key: i,
      emoji,
      flipped: false,
      matched: false,
    }));
  });
  const [first, setFirst] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [locked, setLocked] = useState(false);

  const startRef = useRef(Date.now());
  const doneRef = useRef(false);
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  const flipCard = (key: number) => {
    if (paused || locked || doneRef.current) return;
    const card = cards.find((c) => c.key === key);
    if (!card || card.flipped || card.matched) return;
    sfx.flip();
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, flipped: true } : c)));

    if (first === null) {
      setFirst(key);
      return;
    }
    const firstCard = cards.find((c) => c.key === first);
    const newMoves = moves + 1;
    setMoves(newMoves);

    if (firstCard && firstCard.emoji === card.emoji) {
      sfx.acierto();
      const newMatched = matched + 1;
      setMatched(newMatched);
      setCards((prev) =>
        prev.map((c) => (c.key === first || c.key === key ? { ...c, matched: true } : c)),
      );
      setFirst(null);
      if (newMatched === cfg.pairs) {
        doneRef.current = true;
        const secs = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
        const timeBonus = Math.max(0, 600 - secs * 5);
        const score = Math.max(50, cfg.pairs * 100 - newMoves * 3 + timeBonus);
        const levelUp = newMoves <= cfg.pairs * 1.4;
        setTimeout(
          () =>
            finishRef.current(
              score,
              levelUp,
              `${cfg.pairs} parejas · ${newMoves} jugadas · ${secs}s`,
            ),
          700,
        );
      }
    } else {
      const f = first;
      setFirst(null);
      setLocked(true);
      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => (c.key === f || c.key === key ? { ...c, flipped: false } : c)),
        );
        setLocked(false);
      }, 700);
    }
  };

  return (
    <div data-testid="game-board">
      <div className="hud-row">
        <span className="pill">
          Parejas: {matched}/{cfg.pairs}
        </span>
        <span className="pill">Jugadas: {moves}</span>
      </div>
      <div
        className="pairs-grid"
        style={{ gridTemplateColumns: `repeat(${cfg.cols}, 1fr)` }}
      >
        {cards.map((c) => (
          <button
            key={c.key}
            data-testid={`card-${c.key}`}
            data-emoji={c.emoji}
            className={`pcard${c.flipped || c.matched ? ' flipped' : ''}${c.matched ? ' matched' : ''}`}
            onClick={() => flipCard(c.key)}
            aria-label={c.flipped || c.matched ? c.emoji : 'Carta boca abajo'}
          >
            <span className="pcard-inner">
              <span className="pcard-face pcard-front">🧠</span>
              <span className="pcard-face pcard-back">{c.emoji}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
