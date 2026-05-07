export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface WorkerRunRecord {
  id: string;
  workerName: string;
  runType: string;
  trigger: string;
  status: string;
  startedAt: string | Date;
  finishedAt: string | Date | null;
  durationMs: number | null;
  counts: string | null;
  errorMessage: string | null;
  metadata: string | null;
}

export interface WebhookLogRecord {
  id: string;
  webhookId: string | null;
  url: string;
  event: string;
  status: string;
  errorMessage: string | null;
  attempts: number;
  createdAt: string | Date;
}

export interface EmailReceiverLogRecord {
  id: string;
  status: string;
  recipient: string;
  sender: string | null;
  messageId: string | null;
  emailId: string | null;
  subject: string | null;
  hasWebhook: boolean;
  webhookStatus: string | null;
  errorMessage: string | null;
  createdAt: string | Date;
}

export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string | Date;
}

export interface DiagnosticCheck {
  key: string;
  label: string;
  status: "ok" | "missing" | "failed";
  message: string;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export function formatJsonSummary(value: string | null | undefined) {
  if (!value) return "-";
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join(" · ");
  } catch {
    return value;
  }
}

export function statusBadgeVariant(status: string) {
  return status === "success" || status === "stored" || status === "ok" ? "default" : "outline";
}
