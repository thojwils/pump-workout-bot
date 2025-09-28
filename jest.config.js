module.exports = {
  testEnvironment: 'node',

  // Use setupFiles to load environment variables. This runs BEFORE any test code.
  setupFiles: [
    '<rootDir>/tests/setup-env.js'
  ],
  
  // Use setupFilesAfterEnv for test-specific setup (like extending expect).
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // All other settings remain the same
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testTimeout: 10000,
  verbose: true,
  moduleFileExtensions: [
    'js',
    'json'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    'tests/db.integration.test.js', // Ignore the integration test for now
    'tests/commands/game.test.js$',
    'tests/commands/logchop.test.js$'
  ],
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Test Report',
      outputPath: './test-output/test-summary.html',
      includeFailureMsg: true
    }]
  ],
  collectCoverageFrom: [
    'commands/**/*.js',
    'db/**/*.js'
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 50,
      lines: 50
    }
  },
  fakeTimers: {
    enableGlobally: true,
    legacyFakeTimers: false
  },
  maxWorkers: '50%',
  automock: false,
  unmockedModulePathPatterns: [
    '/node_modules/'
  ]
};