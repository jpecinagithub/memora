// Genera dist/sw.js después de `vite build` con la lista exacta de
// ficheros a pre-cachear (incluye los assets con hash). Ejecutar con:
//   node scripts/gen-sw.mjs
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const CACHE = 'memora-v1';

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push('./' + relative(DIST, p).split(sep).join('/'));
  }
  return out.sort();
}

const files = walk(DIST).filter((f) => f !== './sw.js');

const sw = `// MEMORA service worker — generado por scripts/gen-sw.mjs. No editar a mano.
const CACHE = ${JSON.stringify(CACHE)};
const PRECACHE = ${JSON.stringify(files, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero, con fallback a la app cacheada (funciona offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Assets: cache primero, revalida en red en segundo plano
  event.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
`;

writeFileSync(join(DIST, 'sw.js'), sw);
console.log(`sw.js generado con ${files.length} ficheros en precache`);
