"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslations } from "next-intl"

interface EmailServiceConfig {
  enabled: boolean
  apiKey: string
  roleLimits: {
    duke: number
    knight: number
  }
}

export function EmailServiceConfigContent() {
  const [config, setConfig] = useState<EmailServiceConfig>({
    enabled: false,
    apiKey: "",
    roleLimits: {
      duke: -1,
      knight: -1,
    }
  })
  const [loading, setLoading] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const { toast } = useToast()
  const t = useTranslations("emailService")
  const tc = useTranslations("common")

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config/email-service")
      if (res.ok) {
        const data = await res.json() as EmailServiceConfig
        setConfig(data)
      }
    } catch (error) {
      console.error("Failed to fetch email service config:", error)
    }
  }

  const handleSave = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    setLoading(true)
    try {
      const saveData = {
        enabled: config.enabled,
        apiKey: config.apiKey,
        roleLimits: config.roleLimits
      }

      const res = await fetch("/api/config/email-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      })

      if (!res.ok) {
        const error = await res.json() as { error: string }
        throw new Error(error.error || t("saveFailed"))
      }

      toast({
        title: t("saveSuccess"),
        description: t("resendUpdated"),
      })
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

  return (
    <form className="space-y-4" onSubmit={handleSave}>
      <div className="theme-surface-inline-panel flex items-center justify-between rounded-2xl px-4 py-3.5">
        <div className="space-y-0.5">
          <Label htmlFor="enabled" className="text-sm font-medium">
            {t("enableResend")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("enableResendDesc")}
          </p>
        </div>
        <Switch
          id="enabled"
          checked={config.enabled}
          onCheckedChange={(checked: boolean) =>
            setConfig((prev: EmailServiceConfig) => ({ ...prev, enabled: checked }))
          }
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium">
              Resend API Key
            </Label>
            <div className="relative">
              <input
                type="text"
                name="resendConfigUsername"
                autoComplete="username"
                value="resend-config"
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
              <Input
                id="apiKey"
                name="resendApiKey"
                type={showToken ? "text" : "password"}
                autoComplete="new-password"
                value={config.apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((prev: EmailServiceConfig) => ({ ...prev, apiKey: e.target.value }))}
                placeholder={t("apiKeyPlaceholder")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t("allowedRoles")}
            </Label>
            <div className="space-y-4">
              <div className="theme-surface-inline-panel rounded-2xl border p-4 text-sm">
                <p className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  {t("fixedRules")}
                </p>
                <div className="space-y-2 text-foreground/80">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span><strong>{t("emperorRule")}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                    <span><strong>{t("civilianRule")}</strong></span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <p className="text-sm font-medium text-foreground">{t("configurableRoles")}</p>
                </div>
                {[
                  { value: "duke", label: t("dukeLabel"), key: "duke" as const },
                  { value: "knight", label: t("knightLabel"), key: "knight" as const }
                ].map((role) => {
                  const isDisabled = config.roleLimits[role.key] === -1
                  const isEnabled = !isDisabled

                  return (
                    <div
                      key={role.value}
                      className={`theme-surface-inline-panel group relative rounded-2xl border-2 p-4 transition-all duration-200 ${
                        isEnabled
                          ? 'border-primary/30 bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/20 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Checkbox
                              id={`role-${role.value}`}
                              checked={isEnabled}
                              onChange={(checked: boolean) => {
                                setConfig((prev: EmailServiceConfig) => ({
                                  ...prev,
                                  roleLimits: {
                                    ...prev.roleLimits,
                                    [role.key]: checked ? 0 : -1
                                  }
                                }))
                              }}
                            />
                          </div>
                          <div>
                            <Label
                              htmlFor={`role-${role.value}`}
                              className="text-base font-semibold cursor-pointer select-none flex items-center gap-2"
                            >
                              <span className="text-2xl">
                                {role.value === 'duke' ? '🏰' : '⚔️'}
                              </span>
                              {role.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {isEnabled ? t("sendEnabled") : t("sendDisabled")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <Label className="text-xs font-medium text-muted-foreground block mb-1">{t("dailyLimit")}</Label>
                            <div className="flex items-center space-x-2">
                              <Input
                                type="number"
                                min="-1"
                                value={config.roleLimits[role.key]}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setConfig((prev: EmailServiceConfig) => ({
                                    ...prev,
                                    roleLimits: {
                                      ...prev.roleLimits,
                                      [role.key]: parseInt(e.target.value) || 0
                                    }
                                  }))
                                }
                                className="w-20 h-9 text-center text-sm font-medium"
                                placeholder="0"
                                disabled={isDisabled}
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{t("perDay")}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{t("unlimitedHint")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
      >
        {loading ? t("saving") : t("saveConfig")}
      </Button>
    </form>
  )
}
