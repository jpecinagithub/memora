import { useSyncExternalStore } from 'react';
import { GAMES } from '../data/games';
import { setSoundEnabled } from '../lib/audio';

export interface HistoryEntry {
  d: string; // YYYY-MM-DD
  score: number;
}

export interface GameStat {
  best: number;
  plays: number;
  level: number; // 1..3
  history: HistoryEntry[];
}

export interface MemoraState {
  streak: { days: string[]; last: string };
  workouts: Record<string, string[]>; // fecha -> ids de juegos completados
  games: Record<string, GameStat>;
  xp: number;
  sound: boolean;
  indiceHistory: { d: string; v: number }[];
}

export const KEY = 'memora:v1';

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

// 3 juegos rotando de forma determinista por día: (díaDelAño + i*3) % 9
export function workoutFor(d = new Date()): string[] {
  const doy = dayOfYear(d);
  const n = GAMES.length;
  return [0, 1, 2].map((i) => GAMES[(doy + i * 3) % n].id);
}

function defaultStat(): GameStat {
  return { best: 0, plays: 0, level: 1, history: [] };
}

function defaultState(): MemoraState {
  const games: Record<string, GameStat> = {};
  for (const g of GAMES) games[g.id] = defaultStat();
  return {
    streak: { days: [], last: '' },
    workouts: {},
    games,
    xp: 0,
    sound: true,
    indiceHistory: [],
  };
}

function load(): MemoraState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<MemoraState>;
    return {
      streak: parsed.streak ?? base.streak,
      workouts: parsed.workouts ?? {},
      games: { ...base.games, ...(parsed.games ?? {}) },
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
      indiceHistory: Array.isArray(parsed.indiceHistory) ? parsed.indiceHistory : [],
    };
  } catch {
    return base;
  }
}

let state: MemoraState = load();
setSoundEnabled(state.sound);

const listeners = new Set<() => void>();
function emit(): void {
  for (const l of listeners) l();
}
function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function useMemoraStore(): MemoraState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
  );
}

// Índice de memoria 0-100 = media de las mejores marcas normalizadas
export function memoryIndex(s: MemoraState = state): number {
  if (GAMES.length === 0) return 0;
  const total = GAMES.reduce((acc, g) => {
    const st = s.games[g.id];
    const best = st ? st.best : 0;
    return acc + Math.min(100, (best / g.maxRef) * 100);
  }, 0);
  return Math.round(total / GAMES.length);
}

export function levelForXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

// Días consecutivos con entrenamiento completado (hoy o ayer como último)
export function streakCount(s: MemoraState = state): number {
  const set = new Set(s.streak.days);
  if (set.size === 0) return 0;
  let count = 0;
  const d = new Date();
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(todayKey(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function recordIndice(): void {
  const v = memoryIndex();
  const t = todayKey();
  const hist = state.indiceHistory;
  const last = hist[hist.length - 1];
  if (last && last.d === t) last.v = v;
  else hist.push({ d: t, v });
  if (hist.length > 60) hist.splice(0, hist.length - 60);
}

export const actions = {
  recordSession(
    gameId: string,
    score: number,
    levelUp: boolean,
  ): { isRecord: boolean; xpEarned: number } {
    const st = state.games[gameId] ?? defaultStat();
    const isRecord = score > st.best;
    st.best = Math.max(st.best, score);
    st.plays += 1;
    if (levelUp) st.level = Math.min(3, st.level + 1);
    st.history.push({ d: todayKey(), score });
    if (st.history.length > 30) st.history.splice(0, st.history.length - 30);
    state.games[gameId] = st;
    const xpEarned = Math.floor(score / 10);
    state.xp += xpEarned;
    recordIndice();
    persist();
    emit();
    return { isRecord, xpEarned };
  },

  completeWorkoutDay(dateKey: string, ids: string[]): void {
    state.workouts[dateKey] = ids;
    if (!state.streak.days.includes(dateKey)) {
      state.streak.days.push(dateKey);
      state.streak.days.sort();
    }
    state.streak.last = dateKey;
    state.xp += 50; // bonus por entrenamiento completo
    persist();
    emit();
  },

  toggleSound(): void {
    state.sound = !state.sound;
    setSoundEnabled(state.sound);
    persist();
    emit();
  },
};
