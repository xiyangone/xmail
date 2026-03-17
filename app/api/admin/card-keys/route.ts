import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, gt, lte, or, sql } from "drizzle-orm";
import { auth, checkPermission } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { cardKeys, tempAccounts, users } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

type CardKeyStatus = "all" | "unused" | "used" | "expiring-soon";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isCardKeyStatus(value: string | null): value is CardKeyStatus {
  return value === "all" || value === "unused" || value === "used" || value === "expiring-soon";
}

function buildCardKeyFilters(search: string, status: CardKeyStatus) {
  const filters: SQL<unknown>[] = [];

  if (search) {
    const query = `%${search.toLowerCase()}%`;
    filters.push(
      or(
        sql`lower(${cardKeys.code}) like ${query}`,
        sql`lower(${cardKeys.emailAddress}) like ${query}`,
        sql`lower(coalesce(${users.name}, '')) like ${query}`,
        sql`lower(coalesce(${users.username}, '')) like ${query}`
      )!
    );
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (status === "unused") {
    filters.push(eq(cardKeys.isUsed, false), gt(cardKeys.expiresAt, now));
  }

  if (status === "used") {
    filters.push(eq(cardKeys.isUsed, true));
  }

  if (status === "expiring-soon") {
    filters.push(eq(cardKeys.isUsed, false), gt(cardKeys.expiresAt, now), lte(cardKeys.expiresAt, soon));
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const hasPermission = await checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cardKeyId = searchParams.get("id");

    if (!cardKeyId) {
      return NextResponse.json({ error: "缺少卡密 ID" }, { status: 400 });
    }

    const db = await createDb();
    const cardKey = await db.query.cardKeys.findFirst({
      where: eq(cardKeys.id, cardKeyId),
    });

    if (!cardKey) {
      return NextResponse.json({ error: "卡密不存在" }, { status: 404 });
    }

    if (!cardKey.isUsed) {
      return NextResponse.json({ error: "卡密尚未被使用，无需重置" }, { status: 400 });
    }

    await db
      .update(cardKeys)
      .set({
        isUsed: false,
        usedBy: null,
        usedAt: null,
      })
      .where(eq(cardKeys.id, cardKeyId));

    return NextResponse.json({
      success: true,
      message: "卡密已重置，可再次使用",
    });
  } catch (error) {
    console.error("重置卡密失败:", error);
    return NextResponse.json({ error: "重置卡密失败" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const hasPermission = await checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get("pageSize") ?? searchParams.get("limit"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const requestedPage = parsePositiveInt(searchParams.get("page"), 1);
    const search = searchParams.get("search")?.trim() ?? "";
    const statusParam = searchParams.get("status");
    const status: CardKeyStatus = isCardKeyStatus(statusParam) ? statusParam : "all";

    const db = await createDb();
    const whereClause = buildCardKeyFilters(search, status);

    const totalResult = await db
      .select({ value: count() })
      .from(cardKeys)
      .leftJoin(users, eq(users.id, cardKeys.usedBy))
      .where(whereClause);

    const total = Number(totalResult[0]?.value ?? 0);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const cardKeysList =
      total === 0
        ? []
        : await db
            .select({
              id: cardKeys.id,
              code: cardKeys.code,
              emailAddress: cardKeys.emailAddress,
              mode: cardKeys.mode,
              emailDomain: cardKeys.emailDomain,
              emailLimit: cardKeys.emailLimit,
              isUsed: cardKeys.isUsed,
              usedAt: cardKeys.usedAt,
              createdAt: cardKeys.createdAt,
              expiresAt: cardKeys.expiresAt,
              usedById: users.id,
              usedByName: users.name,
              usedByUsername: users.username,
            })
            .from(cardKeys)
            .leftJoin(users, eq(users.id, cardKeys.usedBy))
            .where(whereClause)
            .orderBy(desc(cardKeys.createdAt))
            .limit(pageSize)
            .offset(offset);

    return NextResponse.json({
      cardKeys: cardKeysList.map((cardKey) => ({
        id: cardKey.id,
        code: cardKey.code,
        emailAddress: cardKey.emailAddress,
        mode: cardKey.mode as "single" | "multi",
        emailDomain: cardKey.emailDomain,
        emailLimit: cardKey.emailLimit,
        isUsed: cardKey.isUsed,
        usedBy: cardKey.usedById
          ? {
              id: cardKey.usedById,
              name: cardKey.usedByName,
              username: cardKey.usedByUsername,
            }
          : null,
        usedAt: cardKey.usedAt,
        createdAt: cardKey.createdAt,
        expiresAt: cardKey.expiresAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("获取卡密列表失败:", error);
    return NextResponse.json({ error: "获取卡密列表失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const hasPermission = await checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cardKeyId = searchParams.get("id");

    if (!cardKeyId) {
      return NextResponse.json({ error: "缺少卡密 ID" }, { status: 400 });
    }

    const db = await createDb();
    const cardKey = await db.query.cardKeys.findFirst({
      where: eq(cardKeys.id, cardKeyId),
    });

    if (!cardKey) {
      return NextResponse.json({ error: "卡密不存在" }, { status: 404 });
    }

    const tempAccount = await db.query.tempAccounts.findFirst({
      where: eq(tempAccounts.cardKeyId, cardKeyId),
    });

    if (tempAccount) {
      await db.delete(users).where(eq(users.id, tempAccount.userId));
    }

    await db.delete(cardKeys).where(eq(cardKeys.id, cardKeyId));

    return NextResponse.json({
      success: true,
      message: tempAccount ? "卡密及关联临时用户删除成功" : "卡密删除成功",
    });
  } catch (error) {
    console.error("删除卡密失败:", error);
    return NextResponse.json({ error: "删除卡密失败" }, { status: 500 });
  }
}
