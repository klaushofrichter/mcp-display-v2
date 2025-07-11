export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit', '<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'server/**/*.js',
    'client/src/**/*.{js,vue}',
    '!server/node_modules/**',
    '!**/node_modules/**',
    '!**/*.config.js'
  ],
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
}; 