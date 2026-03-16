import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    reporters: ['verbose'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
