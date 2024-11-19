export default {
  displayName: "contracts-solana",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  setupFilesAfterEnv: ["jest-expect-message"],
};
