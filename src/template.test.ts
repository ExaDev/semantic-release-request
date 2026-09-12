import { describe, expect, it } from "vitest";
import { renderTemplate } from "./template.js";

describe("renderTemplate", () => {
  it("substitutes ${version}", () => {
    expect(renderTemplate("release/${version}", { version: "1.2.3" })).toBe("release/1.2.3");
  });

  it("substitutes ${notes}", () => {
    expect(renderTemplate("${notes}", { version: "1.0.0", notes: "## Changes" })).toBe(
      "## Changes",
    );
  });

  it("substitutes both placeholders in one template", () => {
    expect(
      renderTemplate("${version}: ${notes}", { version: "1.0.0", notes: "fixed a bug" }),
    ).toBe("1.0.0: fixed a bug");
  });

  it("leaves an unset ${notes} as an empty string", () => {
    expect(renderTemplate("${version}${notes}", { version: "1.0.0" })).toBe("1.0.0");
  });

  it("substitutes every occurrence, not just the first", () => {
    expect(renderTemplate("${version}-${version}", { version: "1.0.0" })).toBe("1.0.0-1.0.0");
  });
});
