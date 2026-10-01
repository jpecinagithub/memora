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

// Registro cronológico de cada partida (para el panel de actividad)
export interface SessionEntry {
  ts: number; // epoch ms
  gameId: string;
  score: number;
  detail?: string;
  xp: number;
  record: boolean;
}

export interface MemoraState {
  streak: { days: string[]; last: string };
  workouts: Record<string, string[]>; // fecha -> ids de juegos completados
  games: Record<string, GameStat>;
  sessions: SessionEntry[];
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
    sessions: [],
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
    const games = { ...base.games, ...(parsed.games ?? {}) };
    let sessions: SessionEntry[] = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    if (sessions.length === 0) {
      // Migración desde el formato antiguo: el historial por juego no tenía
      // marca temporal, así que se reconstruye al mediodía de cada fecha.
      for (const [gid, st] of Object.entries(games)) {
        for (const h of (st as GameStat).history ?? []) {
          const [y, m, d] = h.d.split('-').map(Number);
          if (!y || !m || !d) continue;
          sessions.push({
            ts: new Date(y, m - 1, d, 12, 0, 0).getTime(),
            gameId: gid,
            score: h.score,
            xp: Math.floor(h.score / 10),
            record: false,
          });
        }
      }
      sessions.sort((a, b) => a.ts - b.ts);
    }
    return {
      streak: parsed.streak ?? base.streak,
      workouts: parsed.workouts ?? {},
      games,
      sessions,
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

// Clave YYYY-MM-DD en hora local a partir de un epoch ms
export function dayKeyFromTs(ts: number): string {
  return todayKey(new Date(ts));
}

// Sesiones agrupadas por día (ordenadas por hora)
export function sessionsByDay(s: MemoraState = state): Record<string, SessionEntry[]> {
  const map: Record<string, SessionEntry[]> = {};
  for (const sess of s.sessions) {
    const k = dayKeyFromTs(sess.ts);
    (map[k] ??= []).push(sess);
  }
  for (const arr of Object.values(map)) arr.sort((a, b) => a.ts - b.ts);
  return map;
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
    detail?: string,
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
    state.sessions.push({ ts: Date.now(), gameId, score, detail, xp: xpEarned, record: isRecord });
    if (state.sessions.length > 500) state.sessions.splice(0, state.sessions.length - 500);
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
