import { createDb, type Db } from "./db";
import { adminAuditLogs, emailReceiverLogs, workerRuns } from "./schema";

const DEFAULT_TEXT_LIMIT = 512;
const REDACTED_VALUE = "[redacted]";
const SENSITIVE_KEY_PATTERN = /api[_-]?key|auth[_-]?secret|authorization|credential|password|secret|token/i;

type JsonLike = null | boolean | number | string | JsonLike[] | { [key: string]: JsonLike | unknown };

export interface WorkerRunLogInput {
  workerName: string;
  runType: string;
  trigger: string;
  status: string;
  startedAt?: Date;
  finishedAt?: Date | null;
  durationMs?: number | null;
  counts?: unknown;
  errorMessage?: string | null;
  metadata?: unknown;
}

export interface EmailReceiverLogInput {
  status: string;
  recipient: string;
  sender?: string | null;
  messageId?: string | null;
  emailId?: string | null;
  subject?: string | null;
  hasWebhook?: boolean;
  webhookStatus?: string | null;
  errorMessage?: string | null;
  createdAt?: Date;
}

export interface AdminAuditLogInput {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}

function safeJson(value: unknown) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(sanitizeLogMetadata(value));
}

export function truncateLogMessage(value: string, maxLength?: number): string;
export function truncateLogMessage(value: null | undefined, maxLength?: number): null;
export function truncateLogMessage(value: string | null | undefined, maxLength?: number): string | null;
export function truncateLogMessage(value: string | null | undefined, maxLength = DEFAULT_TEXT_LIMIT) {
  if (value === null || value === undefined) return null;
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
}

export function sanitizeLogMetadata(value: unknown): JsonLike | unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED_VALUE : sanitizeLogMetadata(nestedValue);
  }
  return sanitized;
}

export function buildWorkerRunLog(input: WorkerRunLogInput) {
  const startedAt = input.startedAt ?? new Date();
  const finishedAt = input.finishedAt ?? null;
  const durationMs =
    input.durationMs ?? (finishedAt ? Math.max(0, finishedAt.getTime() - startedAt.getTime()) : null);

  return {
    workerName: input.workerName,
    runType: input.runType,
    trigger: input.trigger,
    status: input.status,
    startedAt,
    finishedAt,
    durationMs,
    counts: safeJson(input.counts),
    errorMessage: truncateLogMessage(input.errorMessage),
    metadata: safeJson(input.metadata),
  };
}

export function buildEmailReceiverLog(input: EmailReceiverLogInput) {
  return {
    status: input.status,
    recipient: truncateLogMessage(input.recipient) ?? "unknown",
    sender: truncateLogMessage(input.sender),
    messageId: truncateLogMessage(input.messageId),
    emailId: input.emailId ?? null,
    subject: truncateLogMessage(input.subject),
    hasWebhook: input.hasWebhook ?? false,
    webhookStatus: truncateLogMessage(input.webhookStatus),
    errorMessage: truncateLogMessage(input.errorMessage),
    createdAt: input.createdAt ?? new Date(),
  };
}

export function buildAdminAuditLog(input: AdminAuditLogInput) {
  return {
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: truncateLogMessage(input.targetId),
    summary: truncateLogMessage(input.summary) ?? "",
    metadata: safeJson(input.metadata),
    ipAddress: truncateLogMessage(input.ipAddress),
    userAgent: truncateLogMessage(input.userAgent),
    createdAt: input.createdAt ?? new Date(),
  };
}

export async function recordWorkerRun(input: WorkerRunLogInput, db?: Db) {
  const database = db ?? (await createDb());
  const [row] = await database.insert(workerRuns).values(buildWorkerRunLog(input)).returning({ id: workerRuns.id });
  return row?.id ?? null;
}

export async function recordEmailReceiverLog(input: EmailReceiverLogInput, db?: Db) {
  const database = db ?? (await createDb());
  const [row] = await database
    .insert(emailReceiverLogs)
    .values(buildEmailReceiverLog(input))
    .returning({ id: emailReceiverLogs.id });
  return row?.id ?? null;
}

export async function recordAdminAuditLog(input: AdminAuditLogInput, db?: Db) {
  const database = db ?? (await createDb());
  const [row] = await database
    .insert(adminAuditLogs)
    .values(buildAdminAuditLog(input))
    .returning({ id: adminAuditLogs.id });
  return row?.id ?? null;
}
