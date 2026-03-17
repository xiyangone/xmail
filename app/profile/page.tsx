import { AppShell } from "@/components/layout/app-shell"
import { ProfileCard } from "@/components/profile/profile-card"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"


export default async function ProfilePage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/")
  }

  return (
    <AppShell>
      <ProfileCard user={session.user} />
    </AppShell>
  )
} 
