"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { Role, ROLES } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EMAIL_CONFIG, EMAIL_PREFIX_FORMATS } from "@/config"
import { DomainEditor } from "./domain-editor"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

export function WebsiteConfigContent() {
  const [defaultRole, setDefaultRole] = useState<string>("")
  const [emailDomains, setEmailDomains] = useState<string>("")
  const [adminContact, setAdminContact] = useState<string>("")
  const [maxEmails, setMaxEmails] = useState<string>(EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString())
  const [allowRegister, setAllowRegister] = useState<boolean>(true)
  const [emailPrefixLength, setEmailPrefixLength] = useState<string>(EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString())
  const [emailPrefixFormat, setEmailPrefixFormat] = useState<string>(EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT)
  const [messagePollInterval, setMessagePollInterval] = useState<string>(EMAIL_CONFIG.POLL_INTERVAL.toString())
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const t = useTranslations("websiteConfig")
  const tr = useTranslations("roles")
  const tc = useTranslations("common")

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    const res = await fetch("/api/config")
    if (res.ok) {
      const data = await res.json() as {
        defaultRole: Exclude<Role, typeof ROLES.EMPEROR>,
        emailDomains: string,
        adminContact: string,
        maxEmails: string,
        allowRegister: boolean,
        emailPrefixLength: string,
        emailPrefixFormat: string,
        messagePollInterval: string
      }
      setDefaultRole(data.defaultRole)
      setEmailDomains(data.emailDomains)
      setAdminContact(data.adminContact)
      setMaxEmails(data.maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString())
      setAllowRegister(data.allowRegister ?? true)
      setEmailPrefixLength(data.emailPrefixLength || EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString())
      setEmailPrefixFormat(data.emailPrefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT)
      setMessagePollInterval(data.messagePollInterval || EMAIL_CONFIG.POLL_INTERVAL.toString())
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultRole,
          emailDomains,
          adminContact,
          maxEmails: maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString(),
          allowRegister,
          emailPrefixLength,
          emailPrefixFormat,
          messagePollInterval
        }),
      })

      if (!res.ok) {
        const errorData = await res.json() as { error?: string }
        throw new Error(errorData.error || t("saveFailed"))
      }

      toast({
        title: t("saveSuccess"),
        description: t("websiteUpdated"),
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="allow-register" className="text-sm font-medium">
            {t("allowRegister")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("allowRegisterDesc")}
          </p>
        </div>
        <Switch
          id="allow-register"
          checked={allowRegister}
          onCheckedChange={setAllowRegister}
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">{t("defaultRole")}</span>
        <Select value={defaultRole} onValueChange={setDefaultRole}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLES.DUKE}>{tr("duke")}</SelectItem>
            <SelectItem value={ROLES.KNIGHT}>{tr("knight")}</SelectItem>
            <SelectItem value={ROLES.CIVILIAN}>{tr("civilian")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">{t("emailDomains")}</span>
        <DomainEditor
          value={emailDomains}
          onChange={setEmailDomains}
          placeholder={t("domainPlaceholder")}
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">{t("adminContact")}</span>
        <div className="flex-1">
          <Input
            value={adminContact}
            onChange={(e) => setAdminContact(e.target.value)}
            placeholder={t("adminContactPlaceholder")}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm">{t("maxEmails")}</span>
        <div className="flex-1">
          <Input
            type="number"
            min="1"
            max="100"
            value={maxEmails}
            onChange={(e) => setMaxEmails(e.target.value)}
            placeholder={`默认为 ${EMAIL_CONFIG.MAX_ACTIVE_EMAILS}`}
          />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("pollConfig")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("pollConfigDesc")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t("pollInterval")}</span>
          <div className="flex-1 flex items-center gap-2">
            <Input
              type="number"
              min="3000"
              max="60000"
              step="1000"
              value={messagePollInterval}
              onChange={(e) => setMessagePollInterval(e.target.value)}
              placeholder={`默认为 ${EMAIL_CONFIG.POLL_INTERVAL} 毫秒`}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {t("pollIntervalSeconds", { seconds: (parseInt(messagePollInterval) / 1000).toFixed(0) })}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("prefixConfig")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("prefixConfigDesc")}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t("prefixLength")}</span>
          <div className="flex-1">
            <Input
              type="number"
              min="4"
              max="20"
              value={emailPrefixLength}
              onChange={(e) => setEmailPrefixLength(e.target.value)}
              placeholder={`默认为 ${EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH} 位`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t("prefixFormat")}</span>
          <div className="flex-1">
            <Select value={emailPrefixFormat} onValueChange={setEmailPrefixFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM}>
                  {t("formatRandom")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_ALPHA}>
                  {t("formatRandomAlpha")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_NUMBER}>
                  {t("formatNameNumber")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_DATE}>
                  {t("formatNameDate")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_YEAR}>
                  {t("formatNameYear")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_DATE}>
                  {t("formatRandomDate")}
                </SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_YEAR}>
                  {t("formatRandomYear")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/settings/cleanup")}
          className="w-full gap-2"
        >
          <Settings className="w-4 h-4" />
          {t("cleanupPolicy")}
        </Button>
      </div>

      <Button
        onClick={handleSave}
        disabled={loading}
        className="w-full"
      >
        {tc("save")}
      </Button>
    </div>
  )
}
