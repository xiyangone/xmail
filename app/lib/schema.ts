import {
  integer,
  sqliteTable,
  text,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations, sql } from "drizzle-orm";

// https://authjs.dev/getting-started/adapters/drizzle
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  username: text("username").unique(),
  password: text("password"),
});
export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const emails = sqliteTable(
  "email",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    address: text("address").notNull().unique(),
    userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index("email_expires_at_idx").on(table.expiresAt),
    userIdCreatedAtIdx: index("email_user_id_created_at_idx").on(table.userId, table.createdAt),
    userIdExpiresAtIdx: index("email_user_id_expires_at_idx").on(table.userId, table.expiresAt),
    addressLowerIdx: index("email_address_lower_idx").on(sql`LOWER(${table.address})`),
  })
);

export const messages = sqliteTable(
  "message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    emailId: text("emailId")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    fromAddress: text("from_address"),
    toAddress: text("to_address"),
    subject: text("subject").notNull(),
    content: text("content").notNull(),
    html: text("html"),
    type: text("type"),
    receivedAt: integer("received_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    sentAt: integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    emailIdIdx: index("message_email_id_idx").on(table.emailId),
    emailIdReceivedAtIdx: index("message_email_id_received_at_idx").on(table.emailId, table.receivedAt),
    emailIdSentAtIdx: index("message_email_id_sent_at_idx").on(table.emailId, table.sentAt),
  })
);

export const webhooks = sqliteTable("webhook", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Webhook 失败日志表
export const webhookLogs = sqliteTable("webhook_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  webhookId: text("webhook_id")
    .references(() => webhooks.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  event: text("event").notNull(),
  payload: text("payload").notNull(), // JSON 字符串
  status: text("status").notNull(), // "success" | "failed"
  errorMessage: text("error_message"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const roles = sqliteTable("role", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

export const userRoles = sqliteTable(
  "user_role",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  })
);

// 卡密表
export const cardKeys = sqliteTable("card_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  emailAddress: text("email_address").notNull(),
  mode: text("mode").notNull().default("single"), // 'single' 或 'multi'
  emailDomain: text("email_domain"), // 多卡密模式时的允许域名
  emailLimit: integer("email_limit").default(1), // 多卡密模式时可创建的邮箱数量
  isUsed: integer("is_used", { mode: "boolean" }).default(false).notNull(),
  usedBy: text("used_by").references(() => users.id, { onDelete: "cascade" }),
  usedAt: integer("used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
}, (table) => ({
  isUsedIdx: index("card_keys_is_used_idx").on(table.isUsed),
  expiresAtIdx: index("card_keys_expires_at_idx").on(table.expiresAt),
}));

// 临时账号表
export const tempAccounts = sqliteTable("temp_accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  cardKeyId: text("card_key_id")
    .notNull()
    .references(() => cardKeys.id, { onDelete: "cascade" }),
  emailAddress: text("email_address").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
}, (table) => ({
  userIdIdx: index("temp_accounts_user_id_idx").on(table.userId),
  expiresAtIdx: index("temp_accounts_expires_at_idx").on(table.expiresAt),
  isActiveExpiresIdx: index("temp_accounts_is_active_expires_idx").on(table.isActive, table.expiresAt),
}));

export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    key: text("key").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
      () => new Date()
    ),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    totalCalls: integer("total_calls").notNull().default(0),
    dailyCalls: integer("daily_calls").notNull().default(0),
    dailyDate: text("daily_date"),
    monthlyCalls: integer("monthly_calls").notNull().default(0),
    monthlyMonth: text("monthly_month"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  },
  (table) => ({
    nameUserIdUnique: uniqueIndex("name_user_id_unique").on(
      table.name,
      table.userId
    ),
  })
);

// 邮箱分享表
export const emailShares = sqliteTable(
  "email_share",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    emailId: text("email_id")
      .notNull()
      .references(() => emails.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    emailIdIdx: index("email_share_email_id_idx").on(table.emailId),
    tokenIdx: index("email_share_token_idx").on(table.token),
  })
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const cardKeysRelations = relations(cardKeys, ({ one }) => ({
  usedByUser: one(users, {
    fields: [cardKeys.usedBy],
    references: [users.id],
  }),
}));

export const tempAccountsRelations = relations(tempAccounts, ({ one }) => ({
  user: one(users, {
    fields: [tempAccounts.userId],
    references: [users.id],
  }),
  cardKey: one(cardKeys, {
    fields: [tempAccounts.cardKeyId],
    references: [cardKeys.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  apiKeys: many(apiKeys),
  tempAccounts: many(tempAccounts),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
}));

export const emailSharesRelations = relations(emailShares, ({ one }) => ({
  email: one(emails, {
    fields: [emailShares.emailId],
    references: [emails.id],
  }),
}));
