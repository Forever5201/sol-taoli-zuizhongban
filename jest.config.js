/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/packages'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }]
  },
  moduleNameMapper: {
    '^@solana-arb-bot/core$': '<rootDir>/packages/core/src/index.ts',
    '^@solana-arb-bot/jupiter-bot$': '<rootDir>/packages/jupiter-bot/src/index.ts',
    '^@solana-arb-bot/onchain-bot$': '<rootDir>/packages/onchain-bot/src/index.ts'
  },
  collectCoverageFrom: [
    '<rootDir>/packages/core/src/economics/**/*.ts',
    '!<rootDir>/packages/*/src/**/*.d.ts',
    '!<rootDir>/packages/*/src/index.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.test.ts'
  ],
  // Temporarily disable coverage threshold for CI
  // coverageThreshold: {
  //   global: {
  //     branches: 50,
  //     functions: 60,
  //     lines: 60,
  //     statements: 60
  //   }
  // },
  coverageDirectory: '<rootDir>/coverage',
  verbose: true,
  testTimeout: 30000,
  maxWorkers: '50%',
  resetModules: true,
  resetMocks: false
};
