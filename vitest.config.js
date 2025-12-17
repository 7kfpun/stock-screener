/* eslint-env node */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const isTest = !!process.env.VITEST;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.jsx',
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  ssr: {
    noExternal: isTest ? ['@mui/x-data-grid'] : [],
  },
});
