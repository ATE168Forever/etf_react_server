export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@shared/env$': '<rootDir>/tests/shared-env-stub.js',
    '^@shared/(.*)\\.(css|scss)$': '<rootDir>/test-style-mock.js',
    '^@shared/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@dividend-life/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@dividend-life/(.*)$': '<rootDir>/src/$1',
    '^@balance-life/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@balance-life/(.*)$': '<rootDir>/../balance-life/src/$1',
    '^@health-life/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@health-life/(.*)$': '<rootDir>/../health-life/src/$1',
    '^@wealth-life/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@wealth-life/(.*)$': '<rootDir>/../wealth-life/src/$1',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '\\.(css|scss)$': '<rootDir>/test-style-mock.js',
    '\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js'
  }
};
