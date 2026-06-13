import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const messageListRoute = readFileSync("app/api/emails/[id]/route.ts", "utf8");
const messageDetailRoute = readFileSync("app/api/emails/[id]/[messageId]/route.ts", "utf8");
const realtimeTokenRoute = readFileSync("app/api/realtime/token/route.ts", "utf8");
const messageList = readFileSync("app/components/emails/message-list.tsx", "utf8");

function assertMailboxListResponseIsLightweight() {
  assert.match(
    messageListRoute,
    /verification_code\s*:/,
    "mailbox list response should expose a lightweight verification_code field"
  );
  assert.doesNotMatch(
    messageListRoute,
    /\bcontent\s*:\s*msg\.content/,
    "mailbox list response should not send full text content"
  );
  assert.doesNotMatch(
    messageListRoute,
    /\bhtml\s*:\s*msg\.html/,
    "mailbox list response should not send full html content"
  );
  assert.match(
    messageDetailRoute,
    /\bcontent\s*:\s*message\.content/,
    "message detail response should keep full content"
  );
  assert.match(
    messageDetailRoute,
    /\bhtml\s*:\s*message\.html/,
    "message detail response should keep full html"
  );
}

function assertFrontendConsumesVerificationCodeSummary() {
  assert.match(
    messageList,
    /verification_code\?:\s*string\s*\|\s*null/,
    "message list item type should include verification_code"
  );
  assert.match(
    messageList,
    /message\.verification_code\s*\?\?/,
    "message list should prefer the API-provided verification_code summary"
  );
}

function assertRealtimeTokenReturnsClientHints() {
  assert.match(
    realtimeTokenRoute,
    /ttlMs\s*:/,
    "realtime token API should return ttlMs for client-side token reuse"
  );
  assert.match(
    realtimeTokenRoute,
    /reason\s*:/,
    "realtime token API should return reason when realtime is unavailable"
  );
}

assertMailboxListResponseIsLightweight();
assertFrontendConsumesVerificationCodeSummary();
assertRealtimeTokenReturnsClientHints();
console.log("api-response-contract tests: OK");
