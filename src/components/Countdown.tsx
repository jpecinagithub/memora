import { useEffect, useState } from 'react';
import { sfx } from '../lib/audio';

export default function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    if (n === 0) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    sfx.tick();
    const t = setTimeout(() => setN(n - 1), 750);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="countdown" data-testid="countdown">
      <div key={n} className="countdown-num">
        {n === 0 ? '¡Ya!' : n}
      </div>
      <p className="countdown-sub">Prepárate…</p>
    </div>
  );
}
