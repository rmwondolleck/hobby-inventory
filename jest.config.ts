import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  // API route tests run in Node; use @jest-environment jsdom at the top of
  // component tests to switch to the browser environment.
  testEnvironment: 'node',
  moduleNameMapper: {
    // Resolve Next.js path alias @/ → src/
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
  ],
  coverageReporters: ['text', 'lcov'],
};

export default config;
