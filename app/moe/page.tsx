import { AppShell } from "@/components/layout/app-shell"
import { ThreeColumnLayout } from "@/components/emails/three-column-layout"
import { NoPermissionDialog } from "@/components/no-permission-dialog"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"


export default async function MoePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/")
  }

  // 临时用户有 VIEW_TEMP_EMAIL 权限，普通用户需要 MANAGE_EMAIL 权限
  const hasManagePermission = await checkPermission(PERMISSIONS.MANAGE_EMAIL)
  const hasViewPermission = await checkPermission(PERMISSIONS.VIEW_TEMP_EMAIL)
  const hasPermission = hasManagePermission || hasViewPermission

  return (
    <AppShell fullHeight mainClassName="h-full">
      <ThreeColumnLayout />
      {!hasPermission && <NoPermissionDialog />}
    </AppShell>
  )
} 
