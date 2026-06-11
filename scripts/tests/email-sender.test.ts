import assert from "node:assert/strict";

import {
  buildCloudflareEmailPayload,
  buildResendEmailPayload,
  normalizeEmailProvider,
  stripHtmlForEmailText,
} from "../../app/lib/email-sender";

async function testProviderNormalization() {
  assert.equal(normalizeEmailProvider("cloudflare"), "cloudflare");
  assert.equal(normalizeEmailProvider("resend"), "resend");
  assert.equal(normalizeEmailProvider(undefined), "resend");
  assert.equal(normalizeEmailProvider("unknown"), "resend");
}

async function testHtmlToTextFallback() {
  assert.equal(
    stripHtmlForEmailText("<p>Hello <strong>XiYang</strong></p><p>Line&nbsp;2</p>"),
    "Hello XiYang\nLine 2"
  );
}

async function testResendPayloadUsesDisplayFromReplyToAndText() {
  const payload = buildResendEmailPayload({
    fromEmail: "sand1993@xiyangone.cn",
    to: "user@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assert.deepEqual(payload, {
    from: "XiYang Mail <sand1993@xiyangone.cn>",
    to: ["user@example.com"],
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
    reply_to: "sand1993@xiyangone.cn",
  });
}

async function testCloudflarePayloadUsesDisplayFromReplyToAndText() {
  const payload = buildCloudflareEmailPayload({
    fromEmail: "sand1993@xiyangone.cn",
    to: "user@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assert.deepEqual(payload, {
    from: { address: "sand1993@xiyangone.cn", name: "XiYang Mail" },
    to: "user@example.com",
    reply_to: "sand1993@xiyangone.cn",
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
  });
}

async function run() {
  await testProviderNormalization();
  await testHtmlToTextFallback();
  await testResendPayloadUsesDisplayFromReplyToAndText();
  await testCloudflarePayloadUsesDisplayFromReplyToAndText();
  console.log("email-sender tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
