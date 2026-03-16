"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
        size="lg" 
        onClick={() => router.push("/moe")}
        className="gap-2 bg-primary hover:bg-primary/90 text-white px-8"
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
          size="lg"
          className="gap-2 bg-primary hover:bg-primary/90 text-white px-8"
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
