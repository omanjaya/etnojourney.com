import { describe, expect, it } from "vitest";
import { pickMessages } from "./messages";

describe("pickMessages", () => {
  const messages = {
    common: { a: "A" },
    partner: { nav: { x: "X" }, meta: { t: "T" } },
    admin: { b: "B" },
  };

  it("keeps whole namespaces and dotted sub-trees only", () => {
    expect(pickMessages(messages, ["common", "partner.nav"])).toEqual({
      common: { a: "A" },
      partner: { nav: { x: "X" } },
    });
  });

  it("ignores unknown paths", () => {
    expect(pickMessages(messages, ["nope", "common.missing"])).toEqual({});
  });
});
