import { Header } from "@/components/layout/header"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"

const AdminDashboard = dynamic(
  () => import("@/components/admin/admin-dashboard").then((mod) => ({ default: mod.AdminDashboard })),
  { loading: () => <div className="text-sm text-muted-foreground py-12 text-center">加载中...</div> }
)

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--page-bg-from))] to-[hsl(var(--page-bg-to))]">
      <div className="container mx-auto px-4 lg:px-8 max-w-[1600px]">
        <Header />
        <main className="pt-20 pb-5">
          <AdminDashboard />
        </main>
      </div>
    </div>
  )
}
