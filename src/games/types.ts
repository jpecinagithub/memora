// Props comunes de todos los juegos de MEMORA.
export interface GameProps {
  level: number; // 1..3, dificultad adaptativa guardada
  paused: boolean; // true mientras el overlay de pausa está visible
  onFinish: (score: number, levelUp: boolean, detail?: string) => void;
}
