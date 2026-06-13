import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const realtimeHook = readFileSync("app/hooks/use-realtime-messages.ts", "utf8");
const configHook = readFileSync("app/hooks/use-config.ts", "utf8");
const messageList = readFileSync("app/components/emails/message-list.tsx", "utf8");
const zh = JSON.parse(readFileSync("messages/zh.json", "utf8")) as {
  email: Record<string, string>;
};
const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as {
  email: Record<string, string>;
};

function assertRealtimeHookHandlesOfflineState() {
  assert.match(
    realtimeHook,
    /window\.addEventListener\(["']offline["']/,
    "realtime hook should listen for browser offline events"
  );
  assert.match(
    realtimeHook,
    /navigator\.onLine\s*===\s*false/,
    "realtime hook should avoid requesting realtime tokens while offline"
  );
  assert.match(
    realtimeHook,
    /window\.addEventListener\(["']online["']/,
    "realtime hook should reconnect immediately when browser goes online"
  );
}

function assertConfigHookDeduplicatesInFlightFetches() {
  assert.match(
    configHook,
    /fetchPromise\s*:/,
    "config store should keep one in-flight fetch promise"
  );
  assert.match(
    configHook,
    /return\s+(?:get\(\)\.)?fetchPromise/,
    "config fetch should reuse the in-flight promise instead of duplicating /api/config"
  );
}

function assertMessageListShowsDetailedRealtimeStates() {
  assert.match(
    messageList,
    /realtimeStatus/,
    "message list should consume the detailed realtime status"
  );
  for (const key of [
    "realtimeConnecting",
    "realtimeReconnecting",
    "realtimeOffline",
    "realtimeUnavailable",
  ]) {
    assert.equal(typeof zh.email[key], "string", `missing zh translation: email.${key}`);
    assert.equal(typeof en.email[key], "string", `missing en translation: email.${key}`);
  }
}

assertRealtimeHookHandlesOfflineState();
assertConfigHookDeduplicatesInFlightFetches();
assertMessageListShowsDetailedRealtimeStates();
console.log("realtime-client tests: OK");
