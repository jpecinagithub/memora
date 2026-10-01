// Efectos de sonido 100% sintetizados con Web Audio. Sin ficheros externos.

let ctx: AudioContext | null = null;
let enabled = true;

try {
  const raw = localStorage.getItem('memora:v1');
  if (raw) {
    const parsed = JSON.parse(raw) as { sound?: boolean };
    if (typeof parsed.sound === 'boolean') enabled = parsed.sound;
  }
} catch {
  /* sin almacenamiento disponible: se queda activado */
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur = 0.15, type: OscillatorType = 'sine', delay = 0, vol = 0.16): void {
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {
    /* audio no disponible */
  }
}

const PAD_FREQS = [261.63, 329.63, 392.0, 440.0]; // Do4 Mi4 Sol4 La4

export const sfx = {
  tick(): void {
    tone(660, 0.08, 'square', 0, 0.07);
  },
  flip(): void {
    tone(440, 0.07, 'triangle', 0, 0.1);
  },
  acierto(): void {
    tone(523.25, 0.12, 'sine');
    tone(783.99, 0.18, 'sine', 0.1);
  },
  fallo(): void {
    tone(220, 0.2, 'sawtooth', 0, 0.09);
    tone(174.61, 0.25, 'sawtooth', 0.12, 0.09);
  },
  victoria(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'sine', i * 0.12, 0.15));
  },
  pad(i: number): void {
    tone(PAD_FREQS[i % PAD_FREQS.length], 0.35, 'sine', 0, 0.18);
  },
};
