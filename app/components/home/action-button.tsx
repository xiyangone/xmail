"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { MAILBOX_ROUTE } from "@/lib/routes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ActionButtonProps {
  isLoggedIn?: boolean
}

export function ActionButton({ isLoggedIn }: ActionButtonProps) {
  const router = useRouter()
  const t = useTranslations("home")
  const ta = useTranslations("auth")
  const tc = useTranslations("common")
  const [open, setOpen] = useState(false)

  if (isLoggedIn) {
    return (
      <Button 
        variant="plain"
        size="lg" 
        onClick={() => router.push(MAILBOX_ROUTE)}
        className="gradient-primary gap-2 rounded-full border border-primary/20 px-8 text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.26)] hover:opacity-95 hover:shadow-[0_22px_48px_hsl(var(--primary)/0.34)]"
      >
        <Mail className="w-5 h-5" />
        {t("enterMailbox")}
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="plain"
          size="lg"
          className="gradient-primary gap-2 rounded-full border border-primary/20 px-8 text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.26)] hover:opacity-95 hover:shadow-[0_22px_48px_hsl(var(--primary)/0.34)]"
        >
          <Mail className="w-5 h-5" />
          {t("enterMailbox")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("loginRequiredTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("loginRequiredDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => router.push("/login")}>
            {ta("loginRegister")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 
