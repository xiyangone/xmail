import {
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSION_KEYS,
  DEFAULT_ROUTE_POLICIES,
} from "../../app/lib/permission-seed";

const nowMsSql = "(CAST(strftime('%s', 'now') AS INTEGER) * 1000)";

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function permissionValues() {
  return DEFAULT_PERMISSION_DEFINITIONS.map((permission) =>
    [
      quote(permission.key),
      quote(permission.key),
      quote(permission.name),
      quote(permission.description),
      "1",
      nowMsSql,
      nowMsSql,
    ].join(", ")
  )
    .map((row) => `(${row})`)
    .join(",\n  ");
}

function buildPermissionSql() {
  return `INSERT INTO \`permission\` (\`id\`, \`key\`, \`name\`, \`description\`, \`is_system\`, \`created_at\`, \`updated_at\`)
VALUES
  ${permissionValues()}
ON CONFLICT(\`key\`) DO UPDATE SET
  \`name\` = excluded.\`name\`,
  \`description\` = excluded.\`description\`,
  \`is_system\` = excluded.\`is_system\`,
  \`updated_at\` = excluded.\`updated_at\`;`;
}

function buildRolePermissionSql() {
  const statements: string[] = [];

  for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSION_KEYS)) {
    for (const permissionKey of permissions) {
      statements.push(
        `INSERT OR IGNORE INTO \`role_permission\` (\`role_id\`, \`permission_key\`, \`created_at\`)
SELECT \`id\`, ${quote(permissionKey)}, ${nowMsSql}
FROM \`role\`
WHERE \`name\` = ${quote(roleName)};`
      );
    }
  }

  return statements.join("\n");
}

function buildRoutePolicySql() {
  return DEFAULT_ROUTE_POLICIES.map((policy) => {
    const requiredPermissions = policy.requiredPermissions.join(",");
    return `INSERT INTO \`route_policy\` (\`id\`, \`path_pattern\`, \`methods\`, \`access\`, \`required_permissions\`, \`allow_api_key\`, \`allow_internal\`, \`priority\`, \`enabled\`, \`description\`, \`created_at\`, \`updated_at\`)
SELECT lower(hex(randomblob(16))), ${quote(policy.pathPattern)}, ${quote(policy.methods)}, ${quote(policy.access)}, ${quote(requiredPermissions)}, ${policy.allowApiKey ? 1 : 0}, ${policy.allowInternal ? 1 : 0}, ${policy.priority}, ${policy.enabled ? 1 : 0}, ${quote(policy.description)}, ${nowMsSql}, ${nowMsSql}
WHERE NOT EXISTS (
  SELECT 1 FROM \`route_policy\`
  WHERE \`path_pattern\` = ${quote(policy.pathPattern)} AND \`methods\` = ${quote(policy.methods)}
);`;
  }).join("\n");
}

export function buildPermissionSeedSql() {
  return [buildPermissionSql(), buildRolePermissionSql(), buildRoutePolicySql()].join("\n");
}
