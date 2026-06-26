const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^zod$": "<rootDir>/node_modules/zod",
  },
  transform: {
    ...tsJestTransformCfg,
  },
};
