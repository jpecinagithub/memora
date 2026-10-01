# MEMORA 🧠

Portal de entrenamiento de memoria con **9 juegos rápidos** (2–4 minutos por sesión).
Sin backend, sin registro, sin cuentas: todo el progreso se guarda en el
`localStorage` del navegador.

> Marca, nombres, textos y sonidos 100% originales, creados para este proyecto.

## Los 9 juegos

| Juego | Habilidad que entrena |
|---|---|
| 🃏 **Parejas** | Memoria visual — encuentra las parejas con el mínimo de jugadas |
| 🔳 **Matriz mental** | Memoria espacial — reproduce el patrón de casillas iluminadas |
| 🎨 **Eco de colores** | Memoria secuencial — repite la secuencia de colores y sonidos |
| 🔁 **Doble turno** | Memoria de trabajo — detecta el símbolo igual al de hace 2 turnos |
| 🔢 **Dígitos fugaces** | Memoria numérica — memoriza y escribe la cifra que desaparece |
| 🕵️ **El intruso** | Reconocimiento — encuentra el elemento nuevo del grupo |
| 🔢 **Orden perdido** | Memoria secuencial — repite el orden de las fichas mezcladas |
| ⚡ **Vistazo relámpago** | Memoria visual — reconoce los 8 elementos ya vistos entre 12 |
| 🗺️ **El camino** | Memoria espacial — recorre el camino iluminado en orden |

Cada juego tiene **3 niveles de dificultad adaptativa**: si lo haces bien, subes
de nivel en la siguiente partida.

## Entrenamiento diario

Cada día se eligen 3 juegos de forma determinista (rotan con el día del año).
Completar los 3 marca el día como hecho, suma **+50 XP** y alimenta tu
**racha** 🔥 de días consecutivos.

## Puntuación y niveles

- Cada sesión da **XP = puntos / 10**.
- **Nivel = floor(XP / 500) + 1**.
- El **Índice de memoria (0–100)** es la media de tus mejores marcas
  normalizadas: mide tu progreso global de un vistazo.

## Cómo correrlo

```bash
npm install
npm run dev      # desarrollo en http://localhost:5173
npm run build    # genera dist/ (funciona con base './', hasta con file://)
```

## Estructura

```
src/
  main.tsx            # entrada
  App.tsx             # router por estado: home | intro | play | result
  styles.css          # design system (sin fuentes externas: system-ui)
  data/games.ts       # definición de los 9 juegos
  state/store.ts      # estado + localStorage (clave memora:v1)
  lib/audio.ts        # efectos Web Audio sintetizados
  lib/timing.ts       # utilidades (pausa, puertas, aleatorio)
  components/         # Home, GameShell, GameIntro, GameResult, Countdown
  games/              # los 9 juegos (Parejas, Matriz, Eco, Doble, …)
```

## Rendimiento

- Cero peticiones de red en tiempo de ejecución (sin Google Fonts ni CDNs).
- Transiciones CSS ≤ 200 ms y animaciones ligeras.
- Todo el estado vive en memoria + `localStorage`.
