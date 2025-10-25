export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '^@shared/(.*)\\.(css|scss)$': '<rootDir>/test-style-mock.js',
    '^@shared/(.*)\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js',
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@balance-life/(.*)$': '<rootDir>/../balance-life/src/$1',
    '^@health-life/(.*)$': '<rootDir>/../health-life/src/$1',
    '^@wealth-life/(.*)$': '<rootDir>/../wealth-life/src/$1',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '\\.(css|scss)$': '<rootDir>/test-style-mock.js',
    '\\.(svg|png|jpe?g|gif)$': '<rootDir>/test-file-mock.js'
  }
};
