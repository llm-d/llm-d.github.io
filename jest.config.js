module.exports = {
  testEnvironment: 'jsdom',
  verbose: false,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@docusaurus/ExecutionEnvironment$': '<rootDir>/tests/mocks/ExecutionEnvironment.js',
  },
};


