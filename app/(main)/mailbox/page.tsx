import { AppShell } from "@/components/layout/app-shell";
import { ThreeColumnLayout } from "@/components/emails/three-column-layout";
import { NoPermissionDialog } from "@/components/no-permission-dialog";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MailboxPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const permissions = session.user.permissions ?? [];
  const hasPermission = permissions.some((permission) =>
    permission === PERMISSIONS.MANAGE_EMAIL || permission === PERMISSIONS.VIEW_TEMP_EMAIL
  );

  return (
    <AppShell fullHeight>
      <ThreeColumnLayout />
      {!hasPermission && <NoPermissionDialog />}
    </AppShell>
  );
}
