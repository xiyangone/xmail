import { checkPermission } from "./auth";
import { PERMISSIONS } from "./permissions";

export const DEFAULT_OPERATION_PAGE_SIZE = 20;
export const MAX_OPERATION_PAGE_SIZE = 100;

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPagination(searchParams: URLSearchParams) {
  const pageSize = Math.min(
    parsePositiveInt(searchParams.get("pageSize") ?? searchParams.get("limit"), DEFAULT_OPERATION_PAGE_SIZE),
    MAX_OPERATION_PAGE_SIZE
  );
  const requestedPage = parsePositiveInt(searchParams.get("page"), 1);
  return { pageSize, requestedPage };
}

export function buildPagination(total: number, pageSize: number, requestedPage: number) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const page = Math.min(requestedPage, totalPages);
  return {
    page,
    pageSize,
    total,
    totalPages,
    offset: (page - 1) * pageSize,
  };
}

export async function canViewOperations() {
  return (
    (await checkPermission(PERMISSIONS.VIEW_OPERATIONS)) ||
    (await checkPermission(PERMISSIONS.MANAGE_OPERATIONS))
  );
}

export async function canManageOperations() {
  return checkPermission(PERMISSIONS.MANAGE_OPERATIONS);
}

export async function canViewWebhookLogs() {
  return (
    (await checkPermission(PERMISSIONS.VIEW_WEBHOOK_LOGS)) ||
    (await checkPermission(PERMISSIONS.VIEW_OPERATIONS)) ||
    (await checkPermission(PERMISSIONS.MANAGE_OPERATIONS))
  );
}

export async function canViewEmailReceiverLogs() {
  return (
    (await checkPermission(PERMISSIONS.VIEW_EMAIL_RECEIVER_LOGS)) ||
    (await checkPermission(PERMISSIONS.VIEW_OPERATIONS)) ||
    (await checkPermission(PERMISSIONS.MANAGE_OPERATIONS))
  );
}

export async function canViewAuditLogs() {
  return (
    (await checkPermission(PERMISSIONS.VIEW_AUDIT_LOGS)) ||
    (await checkPermission(PERMISSIONS.MANAGE_OPERATIONS))
  );
}
