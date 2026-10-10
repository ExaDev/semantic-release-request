import { execa } from "execa";

/**
 * Thin wrapper around the handful of git operations `prepare` needs, so tests can inject a fake implementation instead of shelling out to a real git binary.
 */
export interface GitOperations {
  checkoutNewBranch: (branch: string) => Promise<void>;
  stage: (assets: readonly string[]) => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: (branch: string) => Promise<void>;
  hasStagedChanges: () => Promise<boolean>;
  tagExists: (tag: string) => Promise<boolean>;
  isTagReachableFrom: (tag: string, ref: string) => Promise<boolean>;
  deleteTag: (tag: string) => Promise<void>;
}

export function createGitOperations(cwd: string): GitOperations {
  return {
    async checkoutNewBranch(branch) {
      await execa("git", ["checkout", "-B", branch], { cwd });
    },
    async stage(assets) {
      if (assets.length > 0) {
        await execa("git", ["add", "--", ...assets], { cwd });
      }
    },
    async commit(message) {
      await execa("git", ["commit", "-m", message], { cwd });
    },
    async push(branch) {
      await execa("git", ["push", "--force", "origin", `HEAD:refs/heads/${branch}`], { cwd });
    },
    async hasStagedChanges() {
      const result = await execa("git", ["diff", "--cached", "--quiet"], { cwd, reject: false });

      return result.exitCode !== 0;
    },
    async tagExists(tag) {
      const result = await execa("git", ["rev-parse", "--quiet", "--verify", `refs/tags/${tag}`], {
        cwd,
        reject: false,
      });

      return result.exitCode === 0;
    },
    async isTagReachableFrom(tag, ref) {
      const result = await execa("git", ["merge-base", "--is-ancestor", `refs/tags/${tag}`, ref], {
        cwd,
        reject: false,
      });

      return result.exitCode === 0;
    },
    async deleteTag(tag) {
      const local = await execa("git", ["rev-parse", "--quiet", "--verify", `refs/tags/${tag}`], {
        cwd,
        reject: false,
      });
      if (local.exitCode === 0) {
        await execa("git", ["tag", "--delete", tag], { cwd });
      }
      const remote = await execa("git", ["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], {
        cwd,
        reject: false,
      });
      if (remote.exitCode === 0) {
        await execa("git", ["push", "origin", `:refs/tags/${tag}`], { cwd });
      }
    },
  };
}
