/**
 * Stryker Mutation Testing Configuration
 *
 * What is mutation testing?
 * ─────────────────────────
 * Stryker modifies your source code in small ways (mutations) — flipping
 * booleans, removing conditions, changing operators, etc. — and then runs
 * your test suite against each mutant. If a test catches the mutation (the
 * test fails) the mutant is "killed". If all tests still pass, the mutant
 * "survived", which means your tests aren't covering that logic.
 *
 * Run:   npm run test:mutation
 * Docs:  https://stryker-mutator.io
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: "vitest",

  // Only mutate the sync-critical utility files.
  mutate: [
    "src/utils/syncManager.js",
    "src/utils/electronAdapter.js",
    "src/utils/tagManager.js",
    "src/utils/exportUtils.js",
    "src/utils/fileParser.js",
  ],

  // Run vitest with jsdom for the mutation tests.
  vitest: {
    configFile: "vitest.config.js",
  },

  // HTML + JSON reporters for CI and local review.
  reporters: ["html", "clear-text", "progress", "json"],

  // Stryker output directory.
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },

  // Thresholds — adjust as coverage improves.
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail CI if mutation score drops below this.
  },

  // Limit concurrent test runners to avoid overwhelming the machine.
  concurrency: 4,

  // Timeout per mutant run (ms). Increase if your test suite is slow.
  timeoutMS: 30_000,
  timeoutFactor: 1.5,

  // Ignore trivial/noisy mutators that rarely catch real bugs.
  ignoreMutants: [
    // Console.error calls in catch blocks — not worth testing.
    {
      mutatorName: "StringLiteral",
      description: "ignore string mutations in console.error calls",
    },
  ],

  // Only count mutants that affect real logic (exclude pure formatting).
  mutatorNames: [
    "ArithmeticOperator",
    "BooleanLiteral",
    "ConditionalExpression",
    "EqualityOperator",
    "LogicalOperator",
    "MethodExpression",
    "OptionalChaining",
    "StringLiteral",
    "UnaryOperator",
    "UpdateOperator",
    "BlockStatement",
    "ArrayDeclaration",
    "ObjectAssignment",
  ],
}
