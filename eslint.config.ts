import { exadevConfig } from "@exadev/eslint-config";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...exadevConfig(),
  { ignores: ["dist"] },
  {
    languageOptions: {
      parserOptions: { project: "./tsconfig.json", tsconfigRootDir: import.meta.dirname },
    },
  },
);
