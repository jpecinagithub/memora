// Definición de los 9 juegos de MEMORA. Marca, nombres y textos 100% originales.

export interface GameDef {
  id: string;
  nombre: string;
  descripcion: string;
  comoJugar: string[];
  color: string;
  icono: string;
  habilidad: string;
  maxRef: number; // referencia para normalizar la mejor marca a 0-100 en el Índice
  duracion: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'parejas',
    nombre: 'Parejas',
    descripcion: 'Encuentra todas las parejas de cartas en el menor número de jugadas posible.',
    comoJugar: [
      'Toca dos cartas para voltearlas.',
      'Si coinciden, se quedan boca arriba.',
      'Memoriza dónde está cada símbolo para terminar en menos jugadas.',
    ],
    color: '#FF6B6B',
    icono: '🃏',
    habilidad: 'Memoria visual',
    maxRef: 1500,
    duracion: '2–3 min',
  },
  {
    id: 'matriz',
    nombre: 'Matriz mental',
    descripcion: 'Memoriza el patrón de casillas iluminadas y reprodúcelo tocando.',
    comoJugar: [
      'Observa las casillas que se iluminan.',
      'Tócalas en cualquier orden para repetir el patrón.',
      'Cada acierto añade una casilla. Tienes 3 vidas.',
      'La cuadrícula crece a medida que superas patrones.',
    ],
    color: '#4DABF7',
    icono: '🔳',
    habilidad: 'Memoria espacial',
    maxRef: 400,
    duracion: '2–3 min',
  },
  {
    id: 'eco',
    nombre: 'Eco de colores',
    descripcion: 'Escucha y mira la secuencia de colores… y repítela exactamente igual.',
    comoJugar: [
      'Los botones se iluminan y suenan en un orden.',
      'Tócalos en el mismo orden.',
      'Cada ronda añade un paso. Tienes 3 vidas.',
    ],
    color: '#9775FA',
    icono: '🎨',
    habilidad: 'Memoria secuencial',
    maxRef: 1000,
    duracion: '2–4 min',
  },
  {
    id: 'doble',
    nombre: 'Doble turno',
    descripcion: 'Detecta cuándo el símbolo actual coincide con el de hace dos turnos.',
    comoJugar: [
      'Los símbolos aparecen uno tras otro.',
      'Pulsa «¡Igual!» o la tecla Espacio cuando el actual sea igual al de hace 2.',
      'Rápido y preciso: las falsas alarmas restan.',
    ],
    color: '#FFA94D',
    icono: '🔁',
    habilidad: 'Memoria de trabajo',
    maxRef: 1400,
    duracion: '1–2 min',
  },
  {
    id: 'digitos',
    nombre: 'Dígitos fugaces',
    descripcion: 'Memoriza una cifra que aparece y desaparece… y escríbela de memoria.',
    comoJugar: [
      'Los dígitos aparecen uno a uno y se ocultan.',
      'Escríbelos en orden con el teclado en pantalla.',
      'Acertar alarga la cifra; fallar la acorta.',
    ],
    color: '#3BC9DB',
    icono: '🔢',
    habilidad: 'Memoria numérica',
    maxRef: 1400,
    duracion: '2–3 min',
  },
  {
    id: 'intruso',
    nombre: 'El intruso',
    descripcion: 'Memoriza un grupo y descubre qué elemento nuevo se ha colado.',
    comoJugar: [
      'Memoriza el grupo durante unos segundos.',
      'Vuelve a aparecer con UN elemento nuevo.',
      'Toca al intruso lo antes posible.',
    ],
    color: '#F783AC',
    icono: '🕵️',
    habilidad: 'Reconocimiento',
    maxRef: 2400,
    duracion: '2–3 min',
  },
  {
    id: 'orden',
    nombre: 'Orden perdido',
    descripcion: 'Fíjate en el orden en que se iluminan las fichas y repítelo.',
    comoJugar: [
      'Las fichas se iluminan en un orden concreto.',
      'Después se mezclan.',
      'Tócalas en el orden original.',
    ],
    color: '#69DB7C',
    icono: '🔢',
    habilidad: 'Memoria secuencial',
    maxRef: 1200,
    duracion: '2–3 min',
  },
  {
    id: 'vistazo',
    nombre: 'Vistazo relámpago',
    descripcion: 'Memoriza 8 elementos y encuéntralos entre 12 antes de comprobar.',
    comoJugar: [
      'Memoriza los 8 elementos durante 6 segundos.',
      'Aparecen mezclados con 4 nuevos.',
      'Selecciona los 8 que ya viste y pulsa «Comprobar».',
    ],
    color: '#FFD43B',
    icono: '⚡',
    habilidad: 'Memoria visual',
    maxRef: 900,
    duracion: '2–3 min',
  },
  {
    id: 'camino',
    nombre: 'El camino',
    descripcion: 'Sigue con la mirada el camino que se ilumina y recórrelo en orden.',
    comoJugar: [
      'Un camino se ilumina paso a paso en la cuadrícula.',
      'Toca las casillas en el mismo orden.',
      'Cada acierto alarga el camino. Tienes 3 vidas.',
    ],
    color: '#B197FC',
    icono: '🗺️',
    habilidad: 'Memoria espacial',
    maxRef: 200,
    duracion: '2–4 min',
  },
];

export function getGame(id: string): GameDef {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Juego desconocido: ${id}`);
  return g;
}
