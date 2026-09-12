import { createGitOperations } from "./git.js";
import { parseRepositoryUrl } from "./parse-repository-url.js";
import { createPullRequestOperations } from "./pull-request.js";
import { renderTemplate } from "./template.js";
import type { PluginConfig, PrepareContext } from "./types.js";

const DEFAULT_ASSETS = ["CHANGELOG.md", "package.json"];
const DEFAULT_BRANCH = "release/${version}";
const DEFAULT_COMMIT_MESSAGE = "chore(release): ${version} [skip ci]";

function readGithubToken(env: PrepareContext["env"]): string | undefined {
  const token = env["GITHUB_TOKEN"] ?? env["GH_TOKEN"];
  return token === undefined || token.length === 0 ? undefined : token;
}

/**
 * semantic-release's `verifyConditions` hook: fails fast if a GitHub token isn't available, rather than letting `prepare` fail later with a less obvious authentication error.
 */
export function verifyConditions(_pluginConfig: PluginConfig, context: PrepareContext): void {
  if (readGithubToken(context.env) === undefined) {
    throw new Error(
      "semantic-release-request requires a GITHUB_TOKEN or GH_TOKEN environment variable to open pull requests.",
    );
  }
  if (parseRepositoryUrl(context.options.repositoryUrl) === undefined) {
    throw new Error(
      `semantic-release-request only supports GitHub repositories; could not parse "${context.options.repositoryUrl}" as one.`,
    );
  }
}

/**
 * semantic-release's `prepare` hook: stages the release commit onto a dedicated branch and opens (or updates) a pull request from it, instead of `@semantic-release/git`'s own behaviour of committing directly onto the release branch. Assumes an earlier plugin (typically `@semantic-release/changelog`) has already written whichever of `assets` need updating on disk; this plugin only stages, commits, pushes, and opens the pull request.
 */
export async function prepare(pluginConfig: PluginConfig, context: PrepareContext): Promise<void> {
  const assets = pluginConfig.assets ?? DEFAULT_ASSETS;
  const branch = renderTemplate(pluginConfig.branch ?? DEFAULT_BRANCH, context.nextRelease);
  const commitMessage = renderTemplate(
    pluginConfig.commitMessage ?? DEFAULT_COMMIT_MESSAGE,
    context.nextRelease,
  );
  const labels = pluginConfig.labels ?? [];

  const coordinates = parseRepositoryUrl(context.options.repositoryUrl);
  if (coordinates === undefined) {
    throw new Error(
      `semantic-release-request only supports GitHub repositories; could not parse "${context.options.repositoryUrl}" as one.`,
    );
  }

  const token = readGithubToken(context.env);
  if (token === undefined) {
    throw new Error(
      "semantic-release-request requires a GITHUB_TOKEN or GH_TOKEN environment variable to open pull requests.",
    );
  }

  const git = createGitOperations(context.cwd);
  await git.checkoutNewBranch(branch);
  await git.stage(assets);

  if (!(await git.hasStagedChanges())) {
    context.logger.log(
      `No changes to stage for ${branch} -- ${assets.join(", ")} already match this release.`,
    );
    return;
  }

  await git.commit(commitMessage);
  await git.push(branch);

  const pullRequests = createPullRequestOperations(token, coordinates);
  const pullRequest = await pullRequests.openOrUpdate({
    branch,
    baseBranch: context.branch.name,
    title: commitMessage,
    body: context.nextRelease.notes,
    labels,
  });

  context.logger.log(
    `Staged release ${context.nextRelease.version} as pull request #${String(pullRequest.number)} (${pullRequest.htmlUrl}).`,
  );
}
