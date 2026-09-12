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
  };
}
