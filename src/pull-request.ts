import { Octokit } from "@octokit/rest";
import type { RepositoryCoordinates } from "./parse-repository-url.js";

/**
 * The subset of GitHub pull-request operations `prepare` needs, so tests can inject a fake implementation instead of making real API calls.
 */
export interface PullRequestOperations {
  openOrUpdate: (input: {
    readonly branch: string;
    readonly baseBranch: string;
    readonly title: string;
    readonly body: string;
    readonly labels: readonly string[];
  }) => Promise<{ readonly number: number; readonly htmlUrl: string }>;
}

export function createPullRequestOperations(
  auth: string,
  coordinates: RepositoryCoordinates,
): PullRequestOperations {
  const octokit = new Octokit({ auth });
  const { owner, repo } = coordinates;

  return {
    async openOrUpdate({ branch, baseBranch, title, body, labels }) {
      const existing = await octokit.pulls.list({
        owner,
        repo,
        head: `${owner}:${branch}`,
        base: baseBranch,
        state: "open",
      });

      const [openPullRequest] = existing.data;
      if (openPullRequest !== undefined) {
        const updated = await octokit.pulls.update({
          owner,
          repo,
          pull_number: openPullRequest.number,
          title,
          body,
        });
        return { number: updated.data.number, htmlUrl: updated.data.html_url };
      }

      const created = await octokit.pulls.create({
        owner,
        repo,
        head: branch,
        base: baseBranch,
        title,
        body,
      });

      if (labels.length > 0) {
        await octokit.issues.addLabels({
          owner,
          repo,
          issue_number: created.data.number,
          labels: [...labels],
        });
      }

      return { number: created.data.number, htmlUrl: created.data.html_url };
    },
  };
}
