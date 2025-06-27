export default {
  // Test environment
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',

  // TypeScript configuration
  globals: {
    'ts-jest': {
      useESM: true,
      isolatedModules: true,
      tsconfig: 'tsconfig.test.json'
    }
  },

  // Module resolution
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],

  // Test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/'
  ],

  // Coverage configuration
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts' // Main entry point often has minimal logic
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test setup
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Display configuration
  verbose: true,
  bail: false,

  // Performance
  maxWorkers: '50%',

  // Error handling
  errorOnDeprecated: true,

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      isolatedModules: true
    }]
  },

  // Mock configuration
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Test result processors
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }]
  ]
};