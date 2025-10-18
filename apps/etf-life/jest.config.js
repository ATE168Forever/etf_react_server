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
    '^firebase/app$': '<rootDir>/tests/mocks/firebaseApp.js',
    '^firebase/firestore$': '<rootDir>/tests/mocks/firebaseFirestore.js'
  }
};
