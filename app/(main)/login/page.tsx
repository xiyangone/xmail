import { LoginForm } from "@/components/auth/login-form"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"


export default async function LoginPage() {
  const session = await auth()
  
  if (session?.user) {
    redirect("/")
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </div>
  )
} 
