import assert from "node:assert/strict";

import {
  createRealtimeTokenPayload,
  REALTIME_TOKEN_TTL_MS,
  signRealtimeToken,
  verifyRealtimeToken,
} from "../../app/lib/realtime-token";

async function testValidTokenRoundTrip() {
  const now = 1_800_000_000_000;
  const payload = createRealtimeTokenPayload("email-1", "user-1", now);
  const token = await signRealtimeToken(payload, "test-secret");
  const result = await verifyRealtimeToken(token, "test-secret", now + 1_000);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.payload.emailId, "email-1");
    assert.equal(result.payload.userId, "user-1");
    assert.equal(result.payload.exp, now + REALTIME_TOKEN_TTL_MS);
  }
}

async function testRejectsTamperedPayload() {
  const now = 1_800_000_000_000;
  const payload = createRealtimeTokenPayload("email-1", "user-1", now);
  const token = await signRealtimeToken(payload, "test-secret");
  const [payloadPart, signaturePart] = token.split(".");
  const tampered = `${payloadPart.slice(0, -1)}x.${signaturePart}`;
  const result = await verifyRealtimeToken(tampered, "test-secret", now);

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, "invalid_signature");
  }
}

async function testRejectsExpiredToken() {
  const now = 1_800_000_000_000;
  const payload = createRealtimeTokenPayload("email-1", "user-1", now);
  const token = await signRealtimeToken(payload, "test-secret");
  const result = await verifyRealtimeToken(token, "test-secret", now + REALTIME_TOKEN_TTL_MS + 1);

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.equal(result.reason, "expired_token");
  }
}

async function run() {
  await testValidTokenRoundTrip();
  await testRejectsTamperedPayload();
  await testRejectsExpiredToken();
  console.log("realtime-token tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
