import { describe, expect, it } from "vitest";
import { parseRepositoryUrl } from "./parse-repository-url.js";

describe("parseRepositoryUrl", () => {
  it.each([
    ["https://github.com/ExaDev/eslint-config.git", { owner: "ExaDev", repo: "eslint-config" }],
    ["https://github.com/ExaDev/eslint-config", { owner: "ExaDev", repo: "eslint-config" }],
    [
      "git+https://github.com/ExaDev/eslint-config.git",
      { owner: "ExaDev", repo: "eslint-config" },
    ],
    ["git@github.com:ExaDev/eslint-config.git", { owner: "ExaDev", repo: "eslint-config" }],
    [
      "ssh://git@github.com/ExaDev/eslint-config.git",
      { owner: "ExaDev", repo: "eslint-config" },
    ],
  ])("parses %s", (url, expected) => {
    expect(parseRepositoryUrl(url)).toEqual(expected);
  });

  it("returns undefined for a non-GitHub URL", () => {
    expect(parseRepositoryUrl("https://gitlab.com/ExaDev/eslint-config.git")).toBeUndefined();
  });

  it("returns undefined for a malformed URL", () => {
    expect(parseRepositoryUrl("not a url at all")).toBeUndefined();
  });
});
