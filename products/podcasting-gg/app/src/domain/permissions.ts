import { orgRoles, type OrgRole } from "./vocab";

/** Higher rank = more power. */
export const roleRank: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export const permissionActions = [
  "org.manage",
  "org.invite",
  "workspace.manage",
  "workspace.write",
  "workspace.read",
  "integrations.manage",
  "approvals.decide",
  "billing.manage", // reserved: owner only
] as const;
export type PermissionAction = (typeof permissionActions)[number];

/** Minimum role required for each action. */
export const actionMinRole: Record<PermissionAction, OrgRole> = {
  "org.manage": "admin",
  "org.invite": "admin",
  "workspace.manage": "admin",
  "workspace.write": "member",
  "workspace.read": "viewer",
  "integrations.manage": "admin",
  "approvals.decide": "admin",
  "billing.manage": "owner",
};

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (orgRoles as readonly string[]).includes(value);
}

/** True when `actual` is at least as powerful as `min`. */
export function hasRole(actual: OrgRole, min: OrgRole): boolean {
  return roleRank[actual] >= roleRank[min];
}

export function can(role: OrgRole, action: PermissionAction): boolean {
  return hasRole(role, actionMinRole[action]);
}

/** All actions a role can perform, for UI gating. */
export function actionsFor(role: OrgRole): PermissionAction[] {
  return permissionActions.filter((a) => can(role, a));
}
