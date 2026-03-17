"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Sun, Moon, Cherry } from "lucide-react"

interface BackgroundSettings {
  bgLight: string
  bgDark: string
  bgSakura: string
  bgEnabled: boolean
}

export function BackgroundSettingsContent() {
  const [settings, setSettings] = useState<BackgroundSettings>({
    bgLight: "",
    bgDark: "",
    bgSakura: "",
    bgEnabled: true,
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const t = useTranslations("backgroundSettings")
  const tc = useTranslations("common")

  useEffect(() => {
    fetch("/api/user/settings")
      .then((res) => res.ok ? res.json() as Promise<BackgroundSettings> : null)
      .then((data) => {
        if (data) {
          setSettings({
            bgLight: data.bgLight || "",
            bgDark: data.bgDark || "",
            bgSakura: data.bgSakura || "",
            bgEnabled: data.bgEnabled ?? true,
          })
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || t("saveFailed"))
      }
      toast({ title: t("saveSuccess"), description: t("bgUpdated") })
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const themeFields = [
    { key: "bgLight" as const, icon: Sun, label: t("lightBg") },
    { key: "bgDark" as const, icon: Moon, label: t("darkBg") },
    { key: "bgSakura" as const, icon: Cherry, label: t("sakuraBg") },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="bg-enabled" className="text-sm font-medium">
            {t("enableBg")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("enableBgDesc")}</p>
        </div>
        <Switch
          id="bg-enabled"
          checked={settings.bgEnabled}
          onCheckedChange={(checked) =>
            setSettings((prev) => ({ ...prev, bgEnabled: checked }))
          }
        />
      </div>

      {themeFields.map(({ key, icon: Icon, label }) => (
        <div key={key} className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm min-w-[60px]">{label}</span>
          <Input
            value={settings[key]}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, [key]: e.target.value }))
            }
            placeholder={t("bgUrlPlaceholder")}
            className="flex-1"
          />
        </div>
      ))}

      <p className="text-xs text-muted-foreground">{t("bgUrlHint")}</p>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {tc("save")}
      </Button>
    </div>
  )
}
