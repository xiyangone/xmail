import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../app/components/admin/admin-dashboard.tsx", import.meta.url), "utf8");

function extractTabIds() {
  const tabItemsMatch = source.match(/const tabItems: AdminTabConfig\[\] = \[([\s\S]*?)\];/);
  assert.ok(tabItemsMatch, "admin dashboard tab config should be statically declared");

  return [...tabItemsMatch[1].matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
}

function run() {
  const typeMatch = source.match(/type AdminTabId =([\s\S]*?);/);
  assert.ok(typeMatch, "AdminTabId union should be declared");
  assert.match(typeMatch[0], /"cleanup-runs"/, "cleanup history needs its own tab id");

  const tabIds = extractTabIds();
  const duplicateIds = tabIds.filter((id, index) => tabIds.indexOf(id) !== index);

  assert.deepEqual(duplicateIds, [], "admin dashboard tab ids should be unique");
  assert.ok(tabIds.includes("cleanup-runs"), "cleanup history tab should be addressable");
  assert.equal(tabIds.filter((id) => id === "cleanup").length, 1, "cleanup settings should keep the cleanup tab id");

  console.log("admin dashboard tab tests: OK");
}

run();
