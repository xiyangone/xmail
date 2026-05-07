import assert from "node:assert/strict";

import { getAllPermissionKeys, getDefaultRolePermissions } from "../../app/lib/permission-seed";
import { hasPermission, PERMISSIONS, ROLES, type Permission, type Role } from "../../app/lib/permissions";

function assertRole(role: Role, expected: Permission[]) {
  const permissions = getDefaultRolePermissions(role);
  assert.deepEqual([...permissions].sort(), [...expected].sort());

  for (const permission of expected) {
    assert.equal(hasPermission([role], permission), true, `${role} should include ${permission}`);
  }
}

function run() {
  assertRole(ROLES.EMPEROR, getAllPermissionKeys());
  assertRole(ROLES.DUKE, [
    PERMISSIONS.MANAGE_EMAIL,
    PERMISSIONS.MANAGE_WEBHOOK,
    PERMISSIONS.MANAGE_API_KEY,
  ]);
  assertRole(ROLES.KNIGHT, [PERMISSIONS.MANAGE_EMAIL, PERMISSIONS.MANAGE_WEBHOOK]);
  assertRole(ROLES.CIVILIAN, []);
  assertRole(ROLES.TEMP_USER, [PERMISSIONS.VIEW_TEMP_EMAIL]);

  assert.equal(hasPermission([ROLES.CIVILIAN], PERMISSIONS.MANAGE_EMAIL), false);
  assert.equal(hasPermission([ROLES.DUKE], PERMISSIONS.MANAGE_CARD_KEYS), false);
  assert.equal(hasPermission([ROLES.EMPEROR], PERMISSIONS.MANAGE_PERMISSIONS), true);

  console.log("permission grants tests: OK");
}

run();
