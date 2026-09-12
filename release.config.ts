import type { Options } from "semantic-release";

type ReleaseLevel = "major" | "minor" | "patch" | false;

interface CommitType {
  readonly type: string;
  readonly release: ReleaseLevel;
}

/**
 * Single source of truth for the conventional-commit types this project uses. commitlint.config.ts imports this for its own type-enum rule, and commit-analyzer's releaseRules below derives from it, so a commit type can't trigger a release without also being accepted by commit-message validation, or the reverse. Mirrors the identical pattern in the \@exadev org's own eslint-config package.
 */
export const commitTypes: readonly CommitType[] = [
  { type: "feat", release: "minor" },
  { type: "fix", release: "patch" },
  { type: "perf", release: "patch" },
  { type: "revert", release: "patch" },
  { type: "refactor", release: "patch" },
  { type: "docs", release: "patch" },
  { type: "style", release: "patch" },
  { type: "test", release: "patch" },
  { type: "build", release: "patch" },
  { type: "ci", release: "patch" },
  { type: "chore", release: "patch" },
];

/**
 * Runs on `main`. Analyses commits since the last tag and, if a release is due, generates the changelog entry and bumps package.json, then stages both onto a release branch and opens a pull request via this repo's own plugin (`./dist/index.js`, the local build -- dogfooding this package's own mechanism for its own releases) rather than pushing directly to `main`. Publishing to npm, tagging, and creating the GitHub Release happen separately, in the `publish` job of .github/workflows/ci.yml, triggered by that pull request merging -- since semantic-release itself has no way to pause mid-run for an asynchronous PR review and merge.
 */
const config: Options = {
  branches: ["main"],
  plugins: [
    [
      "@semantic-release/commit-analyzer",
      {
        preset: "conventionalcommits",
        releaseRules: [
          { breaking: true, release: "major" },
          ...commitTypes.map((commitType) => ({ type: commitType.type, release: commitType.release })),
        ],
      },
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        // Deliberately angular, not conventionalcommits -- conventional-changelog-writer's bundled commit partial doesn't match the conventionalcommits preset's function-based partial signature, producing a changelog with a version header and nothing under it.
        preset: "angular",
      },
    ],
    "@semantic-release/changelog",
    ["./dist/index.js", { labels: ["release"] }],
  ],
};

export default config;
