import assert from "node:assert/strict";

import {
  buildAdminAuditLog,
  buildEmailReceiverLog,
  buildWorkerRunLog,
  sanitizeLogMetadata,
  truncateLogMessage,
} from "../../app/lib/operations-log";

function run() {
  const longMessage = "x".repeat(1_500);
  const truncated = truncateLogMessage(longMessage, 32);
  assert.equal(truncated.length, 32);
  assert.equal(truncated.endsWith("..."), true);

  const sanitized = sanitizeLogMetadata({
    ok: true,
    apiKey: "secret-value",
    nested: {
      token: "private-token",
      list: [{ password: "pass" }, { safe: "value" }],
    },
  }) as Record<string, unknown>;
  assert.equal(sanitized.apiKey, "[redacted]");
  assert.deepEqual(sanitized.nested, {
    token: "[redacted]",
    list: [{ password: "[redacted]" }, { safe: "value" }],
  });

  const startedAt = new Date("2026-05-07T00:00:00.000Z");
  const finishedAt = new Date("2026-05-07T00:00:02.250Z");
  const workerRun = buildWorkerRunLog({
    workerName: "cleanup",
    runType: "expired-email-cleanup",
    trigger: "scheduled",
    status: "success",
    startedAt,
    finishedAt,
    counts: { deleted: 7 },
    metadata: { secret: "hidden", region: "wnam" },
  });
  assert.equal(workerRun.durationMs, 2250);
  assert.match(workerRun.counts ?? "", /"deleted":7/);
  assert.match(workerRun.metadata ?? "", /"secret":"\[redacted\]"/);

  const emailLog = buildEmailReceiverLog({
    status: "stored",
    recipient: "inbox@example.com",
    sender: "sender@example.com",
    subject: longMessage,
    hasWebhook: true,
    webhookStatus: "success",
  });
  assert.equal(emailLog.recipient, "inbox@example.com");
  assert.equal(emailLog.hasWebhook, true);
  assert.ok((emailLog.subject?.length ?? 0) <= 512);

  const auditLog = buildAdminAuditLog({
    actorUserId: "user-1",
    action: "config.update",
    targetType: "config",
    summary: longMessage,
    metadata: { AUTH_SECRET: "raw-secret", safe: "visible" },
    ipAddress: "192.0.2.10",
    userAgent: "test-agent",
  });
  assert.equal(auditLog.summary.length, 512);
  assert.match(auditLog.metadata ?? "", /"AUTH_SECRET":"\[redacted\]"/);
  assert.match(auditLog.metadata ?? "", /"safe":"visible"/);

  console.log("operations log tests: OK");
}

run();
