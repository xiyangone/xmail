import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"


export default async function LoginPage() {
  const session = await auth()
  
  if (session?.user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--page-bg-from))] to-[hsl(var(--page-bg-to))]">
      <LoginForm />
    </div>
  )
} 