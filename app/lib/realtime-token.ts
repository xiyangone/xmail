export interface RealtimeTokenPayload {
  emailId: string;
  userId: string;
  iat: number;
  exp: number;
}

export const REALTIME_TOKEN_TTL_MS = 10 * 60 * 1000;

function base64UrlEncodeBytes(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeText(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeText(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlDecodeBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacSha256(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

export function createRealtimeTokenPayload(emailId: string, userId: string, now = Date.now()): RealtimeTokenPayload {
  return {
    emailId,
    userId,
    iat: now,
    exp: now + REALTIME_TOKEN_TTL_MS,
  };
}

export async function signRealtimeToken(payload: RealtimeTokenPayload, secret: string) {
  if (!secret) {
    throw new Error("Missing realtime token secret");
  }

  const payloadPart = base64UrlEncodeText(JSON.stringify(payload));
  const signaturePart = base64UrlEncodeBytes(await hmacSha256(payloadPart, secret));
  return `${payloadPart}.${signaturePart}`;
}

export async function verifyRealtimeToken(token: string, secret: string, now = Date.now()) {
  if (!secret) {
    return { valid: false as const, reason: "missing_secret" };
  }

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) {
    return { valid: false as const, reason: "malformed_token" };
  }

  try {
    const expectedSignature = await hmacSha256(payloadPart, secret);
    const actualSignature = base64UrlDecodeBytes(signaturePart);
    if (!timingSafeEqual(expectedSignature, actualSignature)) {
      return { valid: false as const, reason: "invalid_signature" };
    }

    const payload = JSON.parse(base64UrlDecodeText(payloadPart)) as Partial<RealtimeTokenPayload>;
    if (!payload.emailId || !payload.userId || typeof payload.exp !== "number") {
      return { valid: false as const, reason: "invalid_payload" };
    }

    if (payload.exp <= now) {
      return { valid: false as const, reason: "expired_token" };
    }

    return { valid: true as const, payload: payload as RealtimeTokenPayload };
  } catch {
    return { valid: false as const, reason: "invalid_token" };
  }
}
