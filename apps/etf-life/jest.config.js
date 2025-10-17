export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/test-style-mock.js',
    '^firebase/(.*)$': '<rootDir>/tests/__mocks__/firebase/$1.js',
    '^\\./firebase/config$': '<rootDir>/tests/__mocks__/firebase/config.js'
  }
};
