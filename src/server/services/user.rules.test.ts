import { describe, expect, it } from "vitest";
import { disableError, isDemotion, roleChangeError, type ManagedUser } from "./user.rules";

const admin = (id: string, disabledAt: Date | null = null): ManagedUser => ({
  id,
  role: "admin",
  disabledAt,
});
const traveller: ManagedUser = { id: "u1", role: "user", disabledAt: null };

describe("roleChangeError", () => {
  it("allows an admin to promote a traveller", () => {
    expect(
      roleChangeError({ actorId: "a1", target: traveller, nextRole: "staff", activeAdmins: 1 }),
    ).toBeNull();
  });

  it("blocks changing your own role, even with other admins around", () => {
    expect(
      roleChangeError({ actorId: "a1", target: admin("a1"), nextRole: "staff", activeAdmins: 3 }),
    ).toBe("cannotChangeSelf");
  });

  it("blocks demoting the last active admin", () => {
    expect(
      roleChangeError({ actorId: "a2", target: admin("a1"), nextRole: "user", activeAdmins: 1 }),
    ).toBe("lastAdmin");
  });

  it("allows demoting an admin when another active admin remains", () => {
    expect(
      roleChangeError({ actorId: "a2", target: admin("a1"), nextRole: "staff", activeAdmins: 2 }),
    ).toBeNull();
  });

  it("allows demoting a disabled admin (they don't count as active)", () => {
    expect(
      roleChangeError({
        actorId: "a2",
        target: admin("a1", new Date()),
        nextRole: "user",
        activeAdmins: 1,
      }),
    ).toBeNull();
  });

  it("treats re-saving admin on an admin as harmless", () => {
    expect(
      roleChangeError({ actorId: "a2", target: admin("a1"), nextRole: "admin", activeAdmins: 1 }),
    ).toBeNull();
  });
});

describe("disableError", () => {
  it("blocks disabling yourself", () => {
    expect(disableError({ actorId: "a1", target: admin("a1"), activeAdmins: 5 })).toBe(
      "cannotChangeSelf",
    );
  });

  it("blocks disabling the last active admin", () => {
    expect(disableError({ actorId: "a2", target: admin("a1"), activeAdmins: 1 })).toBe("lastAdmin");
  });

  it("allows disabling travellers and non-last admins", () => {
    expect(disableError({ actorId: "a1", target: traveller, activeAdmins: 1 })).toBeNull();
    expect(disableError({ actorId: "a2", target: admin("a1"), activeAdmins: 2 })).toBeNull();
  });
});

describe("isDemotion", () => {
  it("orders roles user < staff < admin", () => {
    expect(isDemotion("admin", "staff")).toBe(true);
    expect(isDemotion("staff", "user")).toBe(true);
    expect(isDemotion("user", "staff")).toBe(false);
    expect(isDemotion("staff", "staff")).toBe(false);
  });
});
