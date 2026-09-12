# semantic-release-request

[![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/package/semantic-release-request) [![npm version](https://img.shields.io/npm/v/semantic-release-request)](https://www.npmjs.com/package/semantic-release-request) [![CI](https://img.shields.io/github/actions/workflow/status/ExaDev/semantic-release-request/ci.yml?branch=main)](https://github.com/ExaDev/semantic-release-request/actions)

A [semantic-release](https://semantic-release.gitbook.io/) plugin that stages a release as a pull request instead of pushing it directly to the release branch.

## Why

semantic-release's own `@semantic-release/git` plugin commits the version bump and changelog directly onto the release branch (typically `main`). If that branch is protected by a ruleset requiring status checks to pass — including on direct pushes, not just pull request merges — the release push is rejected, because a brand-new commit can never already have a passing check recorded against its own commit SHA. The usual fixes are a GitHub App installation token or a personal access token belonging to someone who can bypass the ruleset, both of which introduce a standing credential whose only job is to get around branch protection.

This plugin avoids that entirely: it stages the release commit on a dedicated branch and opens (or updates) a pull request from it. That pull request goes through the exact same review and CI as any other change — no bypass identity needed anywhere.

## What this plugin does not do

It only replaces `@semantic-release/git`'s `prepare` step. Deciding whether a release is due, computing the next version, and generating changelog notes are all still handled by semantic-release's own `@semantic-release/commit-analyzer` and `@semantic-release/release-notes-generator` — this plugin just changes where the resulting commit lands.

It also does not publish anything. Publishing to npm, creating the git tag, and creating the GitHub Release all have to happen once the staged pull request has actually merged — semantic-release itself has no way to pause a single run and wait an indeterminate amount of time for a human to review and merge a PR. That publish step is a separate workflow, triggered by the pull request's merge event, not part of this plugin or the semantic-release run that used it. See this repository's own `.github/workflows/ci.yml` for a working example (`stage-release` opens the release PR; `publish` runs when it merges).

## Usage

```sh
pnpm add -D semantic-release-request
```

```ts
// release.config.ts
import type { Options } from "semantic-release";

const config: Options = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["semantic-release-request", { labels: ["release"] }],
  ],
};

export default config;
```

Requires a `GITHUB_TOKEN` or `GH_TOKEN` environment variable with permission to push a branch and open pull requests on the repository (the default `GITHUB_TOKEN` in GitHub Actions is sufficient, since the pushed branch is never the protected one).

## Options

| Option          | Default                                    | Description                                                                              |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `assets`        | `["CHANGELOG.md", "package.json"]`          | Files to stage into the release commit.                                                   |
| `branch`        | `"release/${version}"`                      | The branch pushed to and PR'd from. `${version}` is replaced with the release version.    |
| `commitMessage` | `"chore(release): ${version} [skip ci]"`    | The commit message and PR title. `${version}` and `${notes}` are both available.          |
| `labels`        | `[]`                                        | Labels applied when a new pull request is opened. Never removed from an already-open one. |

## License

MIT
