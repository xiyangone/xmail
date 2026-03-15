import { NextRequest, NextResponse } from "next/server"
import { auth, checkPermission, getUserRole } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { users, tempAccounts } from "@/lib/schema"
import { PERMISSIONS, ROLES } from "@/lib/permissions"
import { eq, count, inArray } from "drizzle-orm"


export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 检查权限
    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "10")
    const roleFilter = searchParams.get("role")
    const offset = (page - 1) * pageSize

    const db = await createDb()

    // 使用关联查询一次获取用户和角色信息，避免 N+1 查询
    const userList = await db.query.users.findMany({
      limit: pageSize,
      offset: offset,
      orderBy: (users, { desc }) => [desc(users.id)],
      with: {
        userRoles: {
          with: {
            role: true
          }
        }
      }
    })

    // 批量获取临时用户的到期时间
    const userIds = userList.map(u => u.id)
    const tempAccountsList = userIds.length > 0 ? await db.query.tempAccounts.findMany({
      where: inArray(tempAccounts.userId, userIds)
    }) : []

    // 构建用户ID到临时账号的映射
    const tempAccountMap = new Map(
      tempAccountsList.map(ta => [ta.userId, ta])
    )

    const usersWithRoles = userList.map((user) => {
      const rolesList = user.userRoles.map(ur => ({ name: ur.role.name }))
      const isTempUser = rolesList.some(r => r.name === ROLES.TEMP_USER)
      const tempAccount = tempAccountMap.get(user.id)

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
        roles: rolesList,
        createdAt: new Date().toISOString(),
        expiresAt: isTempUser && tempAccount?.expiresAt
          ? tempAccount.expiresAt.toISOString()
          : null,
      }
    })

    let filteredUsers = usersWithRoles
    if (roleFilter && roleFilter !== "all") {
      filteredUsers = usersWithRoles.filter((user) =>
        user.roles.some((role) => role.name === roleFilter)
      )
    }

    const totalCountResult = await db
      .select({ value: count() })
      .from(users)

    const totalCount = totalCountResult[0]?.value || 0

    return NextResponse.json({
      users: filteredUsers,
      total: totalCount,
      page,
      pageSize,
    })
  } catch (error) {
    console.error("获取用户列表失败:", error)
    return NextResponse.json(
      { error: "获取用户列表失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    // 检查权限
    const hasPermission = await checkPermission(PERMISSIONS.PROMOTE_USER)
    if (!hasPermission) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 })
    }

    // 不能删除自己
    if (userId === session.user.id) {
      return NextResponse.json({ error: "不能删除自己" }, { status: 400 })
    }

    const db = await createDb()

    // 检查用户是否存在
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 检查要删除的用户角色
    const targetUserRole = await getUserRole(userId)
    
    // 不能删除皇帝
    if (targetUserRole === ROLES.EMPEROR) {
      return NextResponse.json({ error: "不能删除皇帝" }, { status: 400 })
    }

    // 删除用户（会级联删除相关数据，但不会删除卡密）
    await db.delete(users).where(eq(users.id, userId))

    return NextResponse.json({
      success: true,
      message: "用户删除成功"
    })

  } catch (error) {
    console.error("删除用户失败:", error)
    return NextResponse.json(
      { error: "删除用户失败" },
      { status: 500 }
    )
  }
}
