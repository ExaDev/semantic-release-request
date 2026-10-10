import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitOperations } from "./git.js";
import type { PullRequestOperations } from "./pull-request.js";
import type { ReleaseContext } from "./types.js";

const gitOperations: GitOperations = {
  checkoutNewBranch: vi.fn(async () => Promise.resolve(undefined)),
  stage: vi.fn(async () => Promise.resolve(undefined)),
  commit: vi.fn(async () => Promise.resolve(undefined)),
  push: vi.fn(async () => Promise.resolve(undefined)),
  hasStagedChanges: vi.fn(async () => Promise.resolve(true)),
  tagExists: vi.fn(async () => Promise.resolve(false)),
  isTagReachableFrom: vi.fn(async () => Promise.resolve(false)),
  deleteTag: vi.fn(async () => Promise.resolve(undefined)),
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

const { prepare, publish, verifyConditions, verifyRelease } = await import("./plugin.js");

function makeContext(overrides: Partial<ReleaseContext> = {}): ReleaseContext {
  return {
    cwd: "/repo",
    env: { GITHUB_TOKEN: "token" },
    branch: { name: "main" },
    nextRelease: { version: "1.2.3", notes: "## 1.2.3\n\n- a change", gitTag: "v1.2.3" },
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
    vi.mocked(gitOperations.tagExists).mockResolvedValue(false);
    vi.mocked(gitOperations.isTagReachableFrom).mockResolvedValue(false);
  });

  it("stages the default assets, commits, pushes, and opens a pull request", async () => {
    const context = makeContext();
    await prepare({}, context);

    expect(gitOperations.checkoutNewBranch).toHaveBeenCalledWith("release/1.2.3");
    expect(gitOperations.stage).toHaveBeenCalledWith(["CHANGELOG.md", "package.json"]);
    expect(gitOperations.commit).toHaveBeenCalledWith("chore(release): 1.2.3");
    expect(gitOperations.push).toHaveBeenCalledWith("release/1.2.3");
    expect(vi.mocked(pullRequestOperations.openOrUpdate)).toHaveBeenCalledWith({
      branch: "release/1.2.3",
      baseBranch: "main",
      title: "chore(release): 1.2.3",
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

  describe("verifyRelease", () => {
    it("removes a tag left by an earlier run that the base branch does not contain", async () => {
      vi.mocked(gitOperations.tagExists).mockResolvedValue(true);
      vi.mocked(gitOperations.isTagReachableFrom).mockResolvedValue(false);

      await verifyRelease({}, makeContext());

      expect(gitOperations.isTagReachableFrom).toHaveBeenCalledWith("v1.2.3", "origin/main");
      expect(gitOperations.deleteTag).toHaveBeenCalledWith("v1.2.3");
    });

    it("keeps a tag the base branch already contains", async () => {
      vi.mocked(gitOperations.tagExists).mockResolvedValue(true);
      vi.mocked(gitOperations.isTagReachableFrom).mockResolvedValue(true);

      await verifyRelease({}, makeContext());

      expect(gitOperations.deleteTag).not.toHaveBeenCalled();
    });

    it("does nothing when the tag does not exist", async () => {
      vi.mocked(gitOperations.tagExists).mockResolvedValue(false);

      await verifyRelease({}, makeContext());

      expect(gitOperations.isTagReachableFrom).not.toHaveBeenCalled();
      expect(gitOperations.deleteTag).not.toHaveBeenCalled();
    });
  });

  describe("publish", () => {
    it("removes the tag the core created for the staged release", async () => {
      await publish({}, makeContext());

      expect(gitOperations.deleteTag).toHaveBeenCalledWith("v1.2.3");
    });
  });
});
