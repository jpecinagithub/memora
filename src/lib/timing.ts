import type { MutableRefObject } from 'react';

// Espera que respeta la pausa: mientras paused sea true el tiempo no avanza.
// Lanza si cancelled pasa a true (desmontaje del juego).
export async function sleepPausable(
  ms: number,
  paused: MutableRefObject<boolean>,
  cancelled: MutableRefObject<boolean>,
): Promise<void> {
  let elapsed = 0;
  const step = 80;
  while (elapsed < ms) {
    if (cancelled.current) throw new Error('cancelled');
    if (!paused.current) elapsed += step;
    await new Promise<void>((r) => setTimeout(r, step));
  }
}

// Puerta de un solo uso: el juego espera la entrada del jugador con wait()
// y la entrada la libera con open(v).
export function createGate<T>(): {
  wait: () => Promise<T>;
  open: (v: T) => void;
  cancel: () => void;
} {
  let resolve: ((v: T) => void) | null = null;
  let reject: ((e: Error) => void) | null = null;
  return {
    wait(): Promise<T> {
      return new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
    },
    open(v: T): void {
      const r = resolve;
      resolve = null;
      reject = null;
      if (r) r(v);
    },
    cancel(): void {
      const rj = reject;
      resolve = null;
      reject = null;
      if (rj) rj(new Error('cancelled'));
    },
  };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickDistinct<T>(pool: T[], n: number): T[] {
  return shuffle(pool).slice(0, n);
}
