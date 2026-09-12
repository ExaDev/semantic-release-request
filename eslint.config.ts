import { exadevConfig } from "@exadev/eslint-config";

export default exadevConfig(
  {},
  { ignores: ["dist"] },
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // This package's own src/index.ts is its public entry point (package.json exports), so it keeps one barrel: override the default "banned" policy to "single".
    rules: { "exadev/barrel-policy": ["error", { mode: "single" }] },
  },
);
