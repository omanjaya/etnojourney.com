import { describe, expect, it } from "vitest";
import { likePattern } from "./like";

describe("likePattern", () => {
  it("wraps plain text", () => {
    expect(likePattern("bromo")).toBe("%bromo%");
  });

  it("escapes wildcard and escape characters", () => {
    expect(likePattern("100%")).toBe("%100\\%%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
    expect(likePattern("c:\\x")).toBe("%c:\\\\x%");
  });
});
