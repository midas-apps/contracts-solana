export default {
  displayName: 'contracts-solana',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  // moduleDirectories: ["node_modules", "."],
  setupFilesAfterEnv: ['jest-expect-message'],
};
