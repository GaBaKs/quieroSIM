import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      // 'server-only' lanza error fuera de React Server Components;
      // en tests lo reemplazamos por un módulo vacío.
      'server-only': path.resolve(__dirname, 'server/lib/__tests__/server-only-stub.ts'),
    },
  },
});
