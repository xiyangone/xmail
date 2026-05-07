import type { User } from "next-auth";
import { and, eq, gt, sql } from "drizzle-orm";
import { createDb } from "./db";
import { apiKeys, apiKeyScopes } from "./schema";
import { sha256Hash } from "@/lib/utils";

const CHINA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

function getChinaPeriodKeys(now: Date) {
  const shifted = new Date(now.getTime() + CHINA_TIMEZONE_OFFSET_MS);
  const iso = shifted.toISOString();
  return {
    day: iso.slice(0, 10),
    month: iso.slice(0, 7),
  };
}

export async function incrementApiKeyUsage(apiKeyId: string) {
  const db = await createDb();
  const now = new Date();
  const { day, month } = getChinaPeriodKeys(now);

  await db
    .update(apiKeys)
    .set({
      totalCalls: sql`${apiKeys.totalCalls} + 1`,
      dailyCalls: sql`CASE WHEN ${apiKeys.dailyDate} = ${day} THEN ${apiKeys.dailyCalls} + 1 ELSE 1 END`,
      dailyDate: day,
      monthlyCalls: sql`CASE WHEN ${apiKeys.monthlyMonth} = ${month} THEN ${apiKeys.monthlyCalls} + 1 ELSE 1 END`,
      monthlyMonth: month,
      lastUsedAt: now,
    })
    .where(eq(apiKeys.id, apiKeyId));
}

export async function getApiKeyByKey(
  key: string
): Promise<{ id: string; user: User } | null> {
  const keyHash = await sha256Hash(key);
  const db = await createDb();

  let apiKey = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.key, keyHash),
      eq(apiKeys.enabled, true),
      gt(apiKeys.expiresAt, new Date())
    ),
    with: {
      user: true,
    },
  });

  if (!apiKey) {
    apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.key, key),
        eq(apiKeys.enabled, true),
        gt(apiKeys.expiresAt, new Date())
      ),
      with: {
        user: true,
      },
    });

    if (apiKey) {
      await db.update(apiKeys).set({ key: keyHash }).where(eq(apiKeys.id, apiKey.id));
    }
  }

  if (!apiKey) return null;

  return { id: apiKey.id, user: apiKey.user };
}

export async function getApiKeyScopeKeys(apiKeyId: string): Promise<string[]> {
  try {
    const db = await createDb();
    const rows = await db.query.apiKeyScopes.findMany({
      where: eq(apiKeyScopes.apiKeyId, apiKeyId),
    });
    return rows.map((row) => row.permissionKey);
  } catch (error) {
    console.error("Failed to fetch API key scopes:", error);
    return [];
  }
}
