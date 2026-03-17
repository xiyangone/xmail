import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";

const AdminDashboard = dynamic(
  () => import("@/components/admin/admin-dashboard").then((mod) => ({ default: mod.AdminDashboard })),
  {
    loading: () => (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading admin workspace...
      </div>
    ),
  }
);

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <AppShell>
      <AdminDashboard />
    </AppShell>
  );
}
