import assert from "node:assert/strict";

import { getVerificationCode } from "../../app/lib/verification-code-fetcher";
import { extractVerificationCodeFromMessage } from "../../app/lib/verification-code";

function withMockedFetch<T>(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T>
) {
  const original = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = mock;
  return fn().finally(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = original;
  });
}

async function testBaseUrlRequiredOnServer() {
  await withMockedFetch(async () => {
    throw new Error("fetch should not be called");
  }, async () => {
    const originalConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.error = () => {};
    await assert.rejects(
      () =>
        getVerificationCode({
          emailId: "test-email",
          verificationCodeInterval: 0,
          verificationCodeTimeout: 10,
        }),
      /baseUrl is required/i
    );
    console.error = originalConsoleError;
  });
}

async function testFetchUsesBaseUrlAndApiKey() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  await withMockedFetch(async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        messages: [
          {
            id: "m1",
            from_address: "verify@example.com",
            subject: "Your verification code is: 672246",
            content: "",
            html: "",
            received_at: Date.now(),
          },
        ],
        nextCursor: null,
        total: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const result = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      apiKey: "k_test",
      verificationCodeInterval: 0,
      verificationCodeTimeout: 1000,
    });

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.code, "672246");
    }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.com/api/emails/abc");
  assert.equal(new Headers(calls[0].init?.headers).get("X-API-Key"), "k_test");
}

async function testTimeoutNoMessages() {
  await withMockedFetch(async () => {
    return new Response(
      JSON.stringify({ messages: [], nextCursor: null, total: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const result = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      verificationCodeInterval: 1,
      verificationCodeTimeout: 10,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.reason, "timeout_no_messages");
      assert.equal(result.stats.messagesSeen, 0);
    }
  });
}

async function testTimeoutNoSenderMatch() {
  await withMockedFetch(async () => {
    return new Response(
      JSON.stringify({
        messages: [
          {
            id: "m2",
            from_address: "no-reply@example.com",
            subject: "Your verification code is: 672246",
            content: "",
            html: "",
            received_at: Date.now(),
          },
        ],
        nextCursor: null,
        total: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const result = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      fromAddress: "verify@example.com",
      verificationCodeInterval: 1,
      verificationCodeTimeout: 10,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.reason, "timeout_no_sender_match");
      assert.equal(result.stats.messagesSeen, 1);
      assert.equal(result.stats.senderMatchedMessages, 0);
    }
  });
}

async function testTimeoutNoCodeMatch() {
  await withMockedFetch(async () => {
    return new Response(
      JSON.stringify({
        messages: [
          {
            id: "m3",
            from_address: "verify@example.com",
            subject: "Welcome aboard",
            content: "Your order number is 672246.",
            html: "",
            received_at: Date.now(),
          },
        ],
        nextCursor: null,
        total: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const result = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      fromAddress: "verify@example.com",
      verificationCodeInterval: 1,
      verificationCodeTimeout: 10,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.reason, "timeout_no_code_match");
      assert.equal(result.stats.messagesSeen, 1);
      assert.equal(result.stats.senderMatchedMessages, 1);
    }
  });
}

async function testMailboxFetchFailure() {
  await withMockedFetch(async () => {
    return new Response("upstream error", { status: 500 });
  }, async () => {
    const result = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      verificationCodeInterval: 1,
      verificationCodeTimeout: 10,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.reason, "mailbox_fetch_failed");
    }
  });
}

async function testHtmlNormalizationFallback() {
  const code = extractVerificationCodeFromMessage({
    html: "<div>Your verification code is <strong>123456</strong></div>",
  });

  assert.equal(code, "123456");
}

async function testHtmlTextExtractionFallback() {
  const code = extractVerificationCodeFromMessage({
    html: "<div>验证码：<span>123456</span></div>",
  });

  assert.equal(code, "123456");
}

async function run() {
  await testBaseUrlRequiredOnServer();
  await testFetchUsesBaseUrlAndApiKey();
  await testTimeoutNoMessages();
  await testTimeoutNoSenderMatch();
  await testTimeoutNoCodeMatch();
  await testMailboxFetchFailure();
  await testHtmlNormalizationFallback();
  await testHtmlTextExtractionFallback();
  console.log("verification-code-fetcher tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
