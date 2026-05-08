import { AppShell } from "@/components/layout/app-shell";
import { ThreeColumnLayout } from "@/components/emails/three-column-layout";
import { NoPermissionDialog } from "@/components/no-permission-dialog";
import { auth, checkPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MailboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const hasManagePermission = await checkPermission(PERMISSIONS.MANAGE_EMAIL);
  const hasViewPermission = await checkPermission(PERMISSIONS.VIEW_TEMP_EMAIL);
  const hasPermission = hasManagePermission || hasViewPermission;

  return (
    <AppShell fullHeight>
      <ThreeColumnLayout />
      {!hasPermission && <NoPermissionDialog />}
    </AppShell>
  );
}
