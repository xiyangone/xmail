import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { auth, checkPermission, getUserRole } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { roles, tempAccounts, userRoles, users } from "@/lib/schema";
import { PERMISSIONS, ROLES } from "@/lib/permissions";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildUserFilters(search: string, roleFilter: string | null) {
  const filters: SQL<unknown>[] = [];

  if (search) {
    const query = `%${search.toLowerCase()}%`;
    filters.push(
      or(
        sql`lower(coalesce(${users.name}, '')) like ${query}`,
        sql`lower(coalesce(${users.username}, '')) like ${query}`,
        sql`lower(coalesce(${users.email}, '')) like ${query}`
      )!
    );
  }

  if (roleFilter && roleFilter !== "all") {
    filters.push(eq(roles.name, roleFilter));
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER);
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pageSize = Math.min(
      parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const requestedPage = parsePositiveInt(searchParams.get("page"), 1);
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search")?.trim() ?? "";

    const db = await createDb();
    const whereClause = buildUserFilters(search, roleFilter);

    const totalResult = await db
      .select({
        value: sql<number>`count(distinct ${users.id})`,
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(whereClause);

    const total = Number(totalResult[0]?.value ?? 0);
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const userIdRows =
      total === 0
        ? []
        : await db
            .selectDistinct({ id: users.id })
            .from(users)
            .leftJoin(userRoles, eq(userRoles.userId, users.id))
            .leftJoin(roles, eq(roles.id, userRoles.roleId))
            .where(whereClause)
            .orderBy(desc(users.id))
            .limit(pageSize)
            .offset(offset);

    const userIds = userIdRows.map((row) => row.id);

    const userList =
      userIds.length === 0
        ? []
        : await db.query.users.findMany({
            where: inArray(users.id, userIds),
            with: {
              userRoles: {
                with: {
                  role: true,
                },
              },
            },
          });

    const tempAccountsList =
      userIds.length === 0
        ? []
        : await db.query.tempAccounts.findMany({
            where: inArray(tempAccounts.userId, userIds),
          });

    const tempAccountMap = new Map(
      tempAccountsList.map((tempAccount) => [tempAccount.userId, tempAccount])
    );
    const userMap = new Map(userList.map((user) => [user.id, user]));

    const normalizedUsers = userIds
      .map((userId) => userMap.get(userId))
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => {
        const rolesList = user.userRoles.map((userRole) => ({ name: userRole.role.name }));
        const isTempUser = rolesList.some((role) => role.name === ROLES.TEMP_USER);
        const tempAccount = tempAccountMap.get(user.id);

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          image: user.image,
          roles: rolesList,
          expiresAt:
            isTempUser && tempAccount?.expiresAt ? tempAccount.expiresAt.toISOString() : null,
        };
      });

    return NextResponse.json({
      users: normalizedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER);
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
    }

    const db = await createDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const targetUserRole = await getUserRole(userId);
    if (targetUserRole === ROLES.EMPEROR) {
      return NextResponse.json({ error: "不能删除皇帝账号" }, { status: 400 });
    }

    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: "用户删除成功",
    });
  } catch (error) {
    console.error("删除用户失败:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}
