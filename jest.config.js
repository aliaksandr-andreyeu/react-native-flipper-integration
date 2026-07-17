/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  roots: ['<rootDir>/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@react-native-community)/)'],
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/examples/'],
  collectCoverageFrom: ['src/index.ts', 'app.plugin.js', '!src/NativeReactNativeFlipperKit.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
