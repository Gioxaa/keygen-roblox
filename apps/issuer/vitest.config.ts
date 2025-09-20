import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reports: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});
