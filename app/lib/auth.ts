import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createDb, Db } from "./db";
import { accounts, users, roles, userRoles } from "./schema";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Permission, hasPermission, ROLES, Role } from "./permissions";
import CredentialsProvider from "next-auth/providers/credentials";
import { hashPassword, comparePassword, needsRehash } from "@/lib/utils";
import { authSchema } from "@/lib/validation";
import { generateAvatarUrl } from "./avatar";
import { getUserId } from "./apiKey";
import { activateCardKey } from "./card-keys";
import { verifyTurnstileToken } from "./turnstile";
import { tempAccounts } from "./schema";
import { and, gt } from "drizzle-orm";

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.EMPEROR]: "皇帝（网站所有者）",
  [ROLES.DUKE]: "公爵（超级用户）",
  [ROLES.KNIGHT]: "骑士（高级用户）",
  [ROLES.CIVILIAN]: "平民（普通用户）",
  [ROLES.TEMP_USER]: "临时用户（卡密用户）",
};

const getDefaultRole = async (): Promise<Role> => {
  const { env } = await getCloudflareContext();
  const defaultRole = await env.SITE_CONFIG.get(
    "DEFAULT_ROLE"
  );

  if (
    defaultRole === ROLES.DUKE ||
    defaultRole === ROLES.KNIGHT ||
    defaultRole === ROLES.CIVILIAN
  ) {
    return defaultRole as Role;
  }

  return ROLES.CIVILIAN;
};

async function findOrCreateRole(db: Db, roleName: Role) {
  let role = await db.query.roles.findFirst({
    where: eq(roles.name, roleName),
  });

  if (!role) {
    const [newRole] = await db
      .insert(roles)
      .values({
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
      })
      .returning();
    role = newRole;
  }

  return role;
}

export async function assignRoleToUser(db: Db, userId: string, roleId: string) {
  await db.delete(userRoles).where(eq(userRoles.userId, userId));

  await db.insert(userRoles).values({
    userId,
    roleId,
  });
}

export async function getUserRole(userId: string) {
  const db = await createDb();
  const userRoleRecords = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
    with: { role: true },
  });
  return userRoleRecords[0].role.name;
}

export async function checkPermission(permission: Permission) {
  const userId = await getUserId();

  if (!userId) return false;

  const db = await createDb();
  const userRoleRecords = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
    with: { role: true },
  });

  const userRoleNames = userRoleRecords.map((ur) => ur.role.name);
  return hasPermission(userRoleNames as Role[], permission);
}

const nextAuth = NextAuth(async () => ({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  adapter: DrizzleAdapter(await createDb(), {
    usersTable: users,
    accountsTable: accounts,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: {
          label: "用户名",
          type: "text",
          placeholder: "请输入用户名",
        },
        password: {
          label: "密码",
          type: "password",
          placeholder: "请输入密码",
        },
        turnstileToken: {
          label: "Turnstile Token",
          type: "text",
        },
      },
      async authorize(credentials, request) {
        if (!credentials) {
          throw new Error("请输入用户名和密码");
        }

        // 验证 Turnstile token
        const turnstileResult = await verifyTurnstileToken(
          credentials.turnstileToken as string,
          request?.headers?.get?.("CF-Connecting-IP")
        );
        if (!turnstileResult.success) {
          throw new Error(turnstileResult.error || "人机验证失败");
        }

        const { username, password } = credentials;

        try {
          authSchema.parse({ username, password });
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          throw new Error("输入格式不正确");
        }

        const db = await createDb();

        const user = await db.query.users.findFirst({
          where: eq(users.username, username as string),
        });

        if (!user) {
          throw new Error("用户名或密码错误");
        }

        const isValid = await comparePassword(
          password as string,
          user.password as string
        );
        if (!isValid) {
          throw new Error("用户名或密码错误");
        }

        // 旧格式密码自动升级为 PBKDF2
        if (needsRehash(user.password as string)) {
          const newHash = await hashPassword(password as string);
          await db.update(users).set({ password: newHash }).where(eq(users.id, user.id));
        }

        return {
          ...user,
          password: undefined,
        };
      },
    }),
    CredentialsProvider({
      id: "card-key",
      name: "卡密登录",
      credentials: {
        cardKey: {
          label: "卡密",
          type: "text",
          placeholder: "请输入卡密",
        },
        turnstileToken: {
          label: "Turnstile Token",
          type: "text",
        },
      },
      async authorize(credentials, request) {
        if (!credentials?.cardKey) {
          throw new Error("请输入卡密");
        }

        // 验证 Turnstile token
        const turnstileResult = await verifyTurnstileToken(
          credentials.turnstileToken as string,
          request?.headers?.get?.("CF-Connecting-IP")
        );
        if (!turnstileResult.success) {
          throw new Error(turnstileResult.error || "人机验证失败");
        }

        const { cardKey } = credentials;

        try {
          // 验证并使用卡密
          const result = await activateCardKey(cardKey as string);

          // 获取创建的用户信息
          const db = await createDb();
          const user = await db.query.users.findFirst({
            where: eq(users.id, result.userId),
          });

          if (!user) {
            throw new Error("用户创建失败");
          }

          return {
            ...user,
            password: undefined,
          };
        } catch (error) {
          throw new Error(
            error instanceof Error ? error.message : "卡密验证失败"
          );
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user.id) return;

      try {
        const db = await createDb();
        const existingRole = await db.query.userRoles.findFirst({
          where: eq(userRoles.userId, user.id),
        });

        if (existingRole) return;

        // 检查用户是否为临时用户
        const tempAccount = await db.query.tempAccounts.findFirst({
          where: and(
            eq(tempAccounts.userId, user.id),
            eq(tempAccounts.isActive, true),
            gt(tempAccounts.expiresAt, new Date())
          ),
        });

        let roleToAssign: Role;
        if (tempAccount) {
          // 如果是临时用户，分配临时用户角色
          roleToAssign = ROLES.TEMP_USER;
        } else {
          // 否则分配默认角色
          roleToAssign = await getDefaultRole();
        }

        const role = await findOrCreateRole(db, roleToAssign);
        await assignRoleToUser(db, user.id, role.id);
      } catch (error) {
        console.error("Error assigning role:", error);
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // 对于OAuth登录（如GitHub），检查是否允许新用户注册
      if (account?.provider === "github") {
        const db = await createDb();

        // 检查用户是否已存在（通过userRoles判断是否为已有用户）
        const existingRole = await db.query.userRoles.findFirst({
          where: eq(userRoles.userId, user.id!),
        });

        // 如果是新用户，检查注册开关
        if (!existingRole) {
          const { env } = await getCloudflareContext();
          const allowRegister = await env.SITE_CONFIG.get("ALLOW_REGISTER");
          if (allowRegister === "false") {
            // 删除DrizzleAdapter自动创建的用户记录
            await db.delete(users).where(eq(users.id, user.id!));
            await db.delete(accounts).where(eq(accounts.userId, user.id!));
            return false; // 拒绝登录
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name || user.username;
        token.username = user.username;
        token.image = user.image || generateAvatarUrl(token.name as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.image = token.image as string;

        const db = await createDb();
        let userRoleRecords = await db.query.userRoles.findMany({
          where: eq(userRoles.userId, session.user.id),
          with: { role: true },
        });

        if (!userRoleRecords.length) {
          // 检查用户是否为临时用户
          const tempAccount = await db.query.tempAccounts.findFirst({
            where: and(
              eq(tempAccounts.userId, session.user.id),
              eq(tempAccounts.isActive, true),
              gt(tempAccounts.expiresAt, new Date())
            ),
          });

          let roleToAssign: Role;
          if (tempAccount) {
            // 如果是临时用户，分配临时用户角色
            roleToAssign = ROLES.TEMP_USER;
          } else {
            // 否则分配默认角色
            roleToAssign = await getDefaultRole();
          }

          const role = await findOrCreateRole(db, roleToAssign);
          await assignRoleToUser(db, session.user.id, role.id);
          userRoleRecords = [
            {
              userId: session.user.id,
              roleId: role.id,
              createdAt: new Date(),
              role: role,
            },
          ];
        }

        session.user.roles = userRoleRecords.map((ur) => ({
          name: ur.role.name,
        }));
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
}));

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
} = nextAuth;

export const auth = nextAuth.auth;

export async function register(username: string, password: string) {
  const db = await createDb();

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    throw new Error("用户名已存在");
  }

  const hashedPassword = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      username,
      password: hashedPassword,
    })
    .returning();

  return user;
}
