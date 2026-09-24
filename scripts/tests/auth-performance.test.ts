import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Db } from "../../app/lib/db";
import { readUserPermissionSnapshot } from "../../app/lib/permission-service";
import { getAllPermissionKeys } from "../../app/lib/permission-seed";
import { PERMISSIONS, ROLES } from "../../app/lib/permissions";

function database(roleName: string, grants: string[]) {
  const counts = { roles: 0, grants: 0 };
  const roles = [{ roleId: "role-a", role: { name: roleName } }];
  const db = {
    query: {
      userRoles: { findMany: async () => { counts.roles += 1; return roles; } },
      rolePermissions: { findMany: async () => {
        counts.grants += 1;
        return grants.map((permissionKey) => ({ roleId: "role-a", permissionKey }));
      } },
    },
  } as unknown as Db;
  return { db, roles, counts };
}

test("session hydration reuses its already loaded roles", async () => {
  const { db, roles, counts } = database(ROLES.CIVILIAN, [PERMISSIONS.VIEW_TEMP_EMAIL]);
  const snapshot = await readUserPermissionSnapshot(db, "user-a", roles);
  assert.deepEqual(snapshot.permissionKeys, [PERMISSIONS.VIEW_TEMP_EMAIL]);
  assert.deepEqual(counts, { roles: 0, grants: 1 });
});

test("standalone checks load roles once and do not retain another user's permissions", async () => {
  const first = database(ROLES.CIVILIAN, [PERMISSIONS.MANAGE_EMAIL]);
  const second = database(ROLES.CIVILIAN, [PERMISSIONS.VIEW_TEMP_EMAIL]);
  const a = await readUserPermissionSnapshot(first.db, "user-a");
  const b = await readUserPermissionSnapshot(second.db, "user-b");
  assert.deepEqual(first.counts, { roles: 1, grants: 1 });
  assert.deepEqual(second.counts, { roles: 1, grants: 1 });
  assert.equal(a.permissionKeys.includes(PERMISSIONS.MANAGE_EMAIL), true);
  assert.equal(b.permissionKeys.includes(PERMISSIONS.MANAGE_EMAIL), false);
});

test("known empty roles do not trigger another lookup or gain permissions", async () => {
  const { db, counts } = database(ROLES.EMPEROR, []);
  const result = await readUserPermissionSnapshot(db, "no-role-user", []);
  assert.deepEqual(result.permissionKeys, []);
  assert.deepEqual(counts, { roles: 0, grants: 0 });
});

test("the emperor shortcut retains all permissions without a grants query", async () => {
  const { db, roles, counts } = database(ROLES.EMPEROR, []);
  assert.deepEqual((await readUserPermissionSnapshot(db, "owner", roles)).permissionKeys, getAllPermissionKeys());
  assert.deepEqual(counts, { roles: 0, grants: 0 });
});

test("server rendering memoization is request-scoped and mailbox access uses the session snapshot", () => {
  const auth = readFileSync("app/lib/auth.ts", "utf8");
  const permissions = readFileSync("app/lib/permission-service.ts", "utf8");
  const mailbox = readFileSync("app/(main)/mailbox/page.tsx", "utf8");
  assert.match(auth, /export const auth = cache\(\(\) => nextAuth\.auth\(\)\)/);
  assert.match(auth, /getUserPermissionSnapshot\(session\.user\.id, userRoleRecords\)/);
  assert.match(permissions, /export const getUserPermissionSnapshot = cache\(/);
  assert.doesNotMatch(auth + permissions, /unstable_cache|"use cache"/);
  assert.match(mailbox, /session\.user\.permissions/);
  assert.doesNotMatch(mailbox, /checkPermission\(/);
});
