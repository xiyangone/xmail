"use client"

import { Moon, Sun, Monitor, Cherry } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

const themeOptions = [
  { value: "light", icon: Sun, labelKey: "themeLight" as const },
  { value: "dark", icon: Moon, labelKey: "themeDark" as const },
  { value: "sakura", icon: Cherry, labelKey: "themeSakura" as const },
  { value: "system", icon: Monitor, labelKey: "themeSystem" as const },
] as const

function ThemeIcon({ resolvedTheme }: { resolvedTheme?: string }) {
  switch (resolvedTheme) {
    case "dark":
      return <Moon className="h-5 w-5" />
    case "sakura":
      return <Cherry className="h-5 w-5" />
    default:
      return <Sun className="h-5 w-5" />
  }
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const t = useTranslations("ui")
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          {mounted ? (
            <ThemeIcon resolvedTheme={resolvedTheme} />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">{t("toggleTheme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeOptions.map(({ value, icon: Icon, labelKey }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            <span>{t(labelKey)}</span>
            {theme === value && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
