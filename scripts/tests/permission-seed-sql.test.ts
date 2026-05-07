import assert from "node:assert/strict";

import { buildPermissionSeedSql } from "../lib/permission-seed-sql";

function run() {
  const sql = buildPermissionSeedSql();

  assert.match(sql, /INSERT INTO `permission`/);
  assert.match(sql, /`key`, `name`, `description`/);
  assert.match(sql, /manage_permissions/);
  assert.match(sql, /INSERT OR IGNORE INTO `role_permission`/);
  assert.match(sql, /WHERE `name` = 'emperor'/);
  assert.match(sql, /INSERT INTO `route_policy`/);
  assert.match(sql, /\/api\/admin\/operations\/:path\*/);
  assert.match(sql, /ON CONFLICT\(`key`\) DO UPDATE/);

  console.log("permission seed sql tests: OK");
}

run();
