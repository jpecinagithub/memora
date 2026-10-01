import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' para que dist/index.html funcione servido desde cualquier ruta (incluso file://)
export default defineConfig({
  plugins: [react()],
  base: './',
});
