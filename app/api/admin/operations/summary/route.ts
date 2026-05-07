import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { canViewOperations } from "@/lib/operations-api";
import { adminAuditLogs, emailReceiverLogs, webhookLogs, workerRuns } from "@/lib/schema";

export async function GET() {
  try {
    if (!(await canViewOperations())) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const db = await createDb();
    const [workerFailureCount, webhookFailureCount, emailFailureCount, auditCount, recentWorkerRuns] =
      await Promise.all([
        db.select({ value: count() }).from(workerRuns).where(eq(workerRuns.status, "failed")),
        db.select({ value: count() }).from(webhookLogs).where(eq(webhookLogs.status, "failed")),
        db.select({ value: count() }).from(emailReceiverLogs).where(eq(emailReceiverLogs.status, "failed")),
        db.select({ value: count() }).from(adminAuditLogs),
        db.select().from(workerRuns).orderBy(desc(workerRuns.startedAt)).limit(8),
      ]);

    return NextResponse.json({
      health: {
        workerFailures: Number(workerFailureCount[0]?.value ?? 0),
        webhookFailures: Number(webhookFailureCount[0]?.value ?? 0),
        emailReceiverFailures: Number(emailFailureCount[0]?.value ?? 0),
        auditEvents: Number(auditCount[0]?.value ?? 0),
      },
      recentWorkerRuns,
    });
  } catch (error) {
    console.error("获取运维概览失败:", error);
    return NextResponse.json({ error: "获取运维概览失败" }, { status: 500 });
  }
}
