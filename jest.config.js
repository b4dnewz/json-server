module.exports = {
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testEnvironment": "node",
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  "testPathIgnorePatterns": [
    "coverage"
  ],
  "coverageDirectory": "./coverage",
  "collectCoverageFrom": [
    "packages/*/src/**/*.ts"
  ]
}
