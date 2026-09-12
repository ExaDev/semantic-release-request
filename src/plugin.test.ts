import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOperations } from "./git.js";
import type { PullRequestOperations } from "./pull-request.js";
import type { PrepareContext } from "./types.js";

const gitOperations: GitOperations = {
  checkoutNewBranch: vi.fn(async () => Promise.resolve(undefined)),
  stage: vi.fn(async () => Promise.resolve(undefined)),
  commit: vi.fn(async () => Promise.resolve(undefined)),
  push: vi.fn(async () => Promise.resolve(undefined)),
  hasStagedChanges: vi.fn(async () => Promise.resolve(true)),
};

const pullRequestOperations: PullRequestOperations = {
  openOrUpdate: vi.fn(async () =>
    Promise.resolve({ number: 42, htmlUrl: "https://github.com/o/r/pull/42" }),
  ),
};

vi.mock("./git.js", () => ({
  createGitOperations: vi.fn(() => gitOperations),
}));

vi.mock("./pull-request.js", () => ({
  createPullRequestOperations: vi.fn(() => pullRequestOperations),
}));

const { prepare, verifyConditions } = await import("./plugin.js");

function makeContext(overrides: Partial<PrepareContext> = {}): PrepareContext {
  return {
    cwd: "/repo",
    env: { GITHUB_TOKEN: "token" },
    branch: { name: "main" },
    nextRelease: { version: "1.2.3", notes: "## 1.2.3\n\n- a change" },
    options: { repositoryUrl: "https://github.com/ExaDev/eslint-config.git" },
    logger: { log: vi.fn(() => undefined) },
    ...overrides,
  };
}

describe("verifyConditions", () => {
  it("passes when a GitHub token and a parseable repository URL are present", () => {
    expect(() => { verifyConditions({}, makeContext()); }).not.toThrow();
  });

  it("throws when no token is available", () => {
    expect(() => { verifyConditions({}, makeContext({ env: {} })); }).toThrow(/GITHUB_TOKEN/);
  });

  it("accepts GH_TOKEN as an alternative to GITHUB_TOKEN", () => {
    expect(() => { verifyConditions({}, makeContext({ env: { GH_TOKEN: "token" } })); },
    ).not.toThrow();
  });

  it("throws for a non-GitHub repository URL", () => {
    expect(() => { verifyConditions({}, makeContext({ options: { repositoryUrl: "https://gitlab.com/o/r" } })); },
    ).toThrow(/only supports GitHub/);
  });
});

describe("prepare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gitOperations.hasStagedChanges).mockResolvedValue(true);
  });

  it("stages the default assets, commits, pushes, and opens a pull request", async () => {
    const context = makeContext();
    await prepare({}, context);

    expect(gitOperations.checkoutNewBranch).toHaveBeenCalledWith("release/1.2.3");
    expect(gitOperations.stage).toHaveBeenCalledWith(["CHANGELOG.md", "package.json"]);
    expect(gitOperations.commit).toHaveBeenCalledWith("chore(release): 1.2.3 [skip ci]");
    expect(gitOperations.push).toHaveBeenCalledWith("release/1.2.3");
    expect(vi.mocked(pullRequestOperations.openOrUpdate)).toHaveBeenCalledWith({
      branch: "release/1.2.3",
      baseBranch: "main",
      title: "chore(release): 1.2.3 [skip ci]",
      body: context.nextRelease.notes,
      labels: [],
    });
  });

  it("honours custom assets, branch, commit message, and labels", async () => {
    await prepare(
      {
        assets: ["package.json"],
        branch: "release-please--${version}",
        commitMessage: "release ${version}",
        labels: ["automated-release"],
      },
      makeContext(),
    );

    expect(gitOperations.stage).toHaveBeenCalledWith(["package.json"]);
    expect(gitOperations.checkoutNewBranch).toHaveBeenCalledWith("release-please--1.2.3");
    expect(gitOperations.commit).toHaveBeenCalledWith("release 1.2.3");
    expect(vi.mocked(pullRequestOperations.openOrUpdate)).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["automated-release"] }),
    );
  });

  it("does nothing further when there are no staged changes", async () => {
    vi.mocked(gitOperations.hasStagedChanges).mockResolvedValue(false);

    await prepare({}, makeContext());

    expect(gitOperations.commit).not.toHaveBeenCalled();
    expect(gitOperations.push).not.toHaveBeenCalled();
    expect(vi.mocked(pullRequestOperations.openOrUpdate)).not.toHaveBeenCalled();
  });

  it("throws when no GitHub token is available", async () => {
    await expect(prepare({}, makeContext({ env: {} }))).rejects.toThrow(/GITHUB_TOKEN/);
  });

  it("throws for a non-GitHub repository URL", async () => {
    await expect(
      prepare({}, makeContext({ options: { repositoryUrl: "https://gitlab.com/o/r" } })),
    ).rejects.toThrow(/only supports GitHub/);
  });
});
