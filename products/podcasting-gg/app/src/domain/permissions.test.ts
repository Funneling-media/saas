import { describe, expect, it } from "vitest";
import { actionsFor, can, hasRole, isOrgRole, permissionActions, roleRank } from "./permissions";
import { orgRoles } from "./vocab";

describe("permissions", () => {
  it("ranks roles in vocab order (power desc)", () => {
    const ranks = orgRoles.map((r) => roleRank[r]);
    expect(ranks).toEqual([4, 3, 2, 1]);
  });

  it("hasRole compares by rank", () => {
    expect(hasRole("owner", "viewer")).toBe(true);
    expect(hasRole("member", "member")).toBe(true);
    expect(hasRole("viewer", "member")).toBe(false);
    expect(hasRole("admin", "owner")).toBe(false);
  });

  it("owner can do everything", () => {
    for (const action of permissionActions) expect(can("owner", action)).toBe(true);
  });

  it("admin can do everything except billing", () => {
    for (const action of permissionActions) {
      expect(can("admin", action)).toBe(action !== "billing.manage");
    }
  });

  it("member can write and read only", () => {
    expect(actionsFor("member")).toEqual(["workspace.write", "workspace.read"]);
  });

  it("viewer can only read", () => {
    expect(actionsFor("viewer")).toEqual(["workspace.read"]);
  });

  it("isOrgRole guards unknown strings", () => {
    expect(isOrgRole("owner")).toBe(true);
    expect(isOrgRole("superuser")).toBe(false);
    expect(isOrgRole(3)).toBe(false);
  });
});
