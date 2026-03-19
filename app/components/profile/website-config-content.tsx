"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { EMAIL_CONFIG, EMAIL_PREFIX_FORMATS } from "@/config";
import { Role, ROLES } from "@/lib/permissions";
import { DomainEditor } from "./domain-editor";

export function WebsiteConfigContent() {
  const [defaultRole, setDefaultRole] = useState<string>("");
  const [emailDomains, setEmailDomains] = useState<string>("");
  const [adminContact, setAdminContact] = useState<string>("");
  const [maxEmails, setMaxEmails] = useState<string>(EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString());
  const [allowRegister, setAllowRegister] = useState<boolean>(true);
  const [emailPrefixLength, setEmailPrefixLength] = useState<string>(
    EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString()
  );
  const [emailPrefixFormat, setEmailPrefixFormat] = useState<string>(EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT);
  const [messagePollInterval, setMessagePollInterval] = useState<string>(EMAIL_CONFIG.POLL_INTERVAL.toString());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("websiteConfig");
  const tr = useTranslations("roles");
  const tc = useTranslations("common");

  useEffect(() => {
    void fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const response = await fetch("/api/config");

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      defaultRole: Exclude<Role, typeof ROLES.EMPEROR>;
      emailDomains: string;
      adminContact: string;
      maxEmails: string;
      allowRegister: boolean;
      emailPrefixLength: string;
      emailPrefixFormat: string;
      messagePollInterval: string;
    };

    setDefaultRole(data.defaultRole);
    setEmailDomains(data.emailDomains);
    setAdminContact(data.adminContact);
    setMaxEmails(data.maxEmails || EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString());
    setAllowRegister(data.allowRegister ?? true);
    setEmailPrefixLength(data.emailPrefixLength || EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString());
    setEmailPrefixFormat(data.emailPrefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT);
    setMessagePollInterval(data.messagePollInterval || EMAIL_CONFIG.POLL_INTERVAL.toString());
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/config", {
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
          messagePollInterval,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || t("saveFailed"));
      }

      toast({
        title: t("saveSuccess"),
        description: t("websiteUpdated"),
      });
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollIntervalSeconds = (
    Math.max(Number.parseInt(messagePollInterval || "0", 10), 0) / 1000
  ).toFixed(0);

  return (
    <div className="space-y-4">
      <div className="theme-surface-inline-panel flex items-center justify-between rounded-2xl px-4 py-3.5">
        <div className="space-y-0.5">
          <Label htmlFor="allow-register" className="text-sm font-medium">
            {t("allowRegister")}
          </Label>
          <p className="text-xs text-muted-foreground">{t("allowRegisterDesc")}</p>
        </div>
        <Switch id="allow-register" checked={allowRegister} onCheckedChange={setAllowRegister} />
      </div>

      <div className="theme-surface-inline-panel flex items-center gap-4 rounded-2xl px-4 py-3.5">
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

      <div className="theme-surface-inline-panel space-y-2 rounded-2xl px-4 py-3.5">
        <span className="text-sm font-medium">{t("emailDomains")}</span>
        <DomainEditor
          value={emailDomains}
          onChange={setEmailDomains}
          placeholder={t("domainPlaceholder")}
        />
      </div>

      <div className="theme-surface-inline-panel flex items-center gap-4 rounded-2xl px-4 py-3.5">
        <span className="text-sm">{t("adminContact")}</span>
        <div className="flex-1">
          <Input
            value={adminContact}
            onChange={(event) => setAdminContact(event.target.value)}
            placeholder={t("adminContactPlaceholder")}
          />
        </div>
      </div>

      <div className="theme-surface-inline-panel flex items-center gap-4 rounded-2xl px-4 py-3.5">
        <span className="text-sm">{t("maxEmails")}</span>
        <div className="flex-1">
          <Input
            type="number"
            min="1"
            max="100"
            value={maxEmails}
            onChange={(event) => setMaxEmails(event.target.value)}
            placeholder={EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString()}
          />
        </div>
      </div>

      <div className="theme-surface-inline-panel space-y-4 rounded-2xl px-4 py-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("pollConfig")}</Label>
          <p className="text-xs text-muted-foreground">{t("pollConfigDesc")}</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t("pollInterval")}</span>
          <div className="flex flex-1 items-center gap-2">
            <Input
              type="number"
              min="3000"
              max="60000"
              step="1000"
              value={messagePollInterval}
              onChange={(event) => setMessagePollInterval(event.target.value)}
              placeholder={EMAIL_CONFIG.POLL_INTERVAL.toString()}
            />
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {t("pollIntervalSeconds", { seconds: pollIntervalSeconds })}
            </span>
          </div>
        </div>
      </div>

      <div className="theme-surface-inline-panel space-y-4 rounded-2xl px-4 py-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("prefixConfig")}</Label>
          <p className="text-xs text-muted-foreground">{t("prefixConfigDesc")}</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm">{t("prefixLength")}</span>
          <div className="flex-1">
            <Input
              type="number"
              min="4"
              max="20"
              value={emailPrefixLength}
              onChange={(event) => setEmailPrefixLength(event.target.value)}
              placeholder={EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH.toString()}
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
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM}>{t("formatRandom")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_ALPHA}>{t("formatRandomAlpha")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_NUMBER}>{t("formatNameNumber")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_DATE}>{t("formatNameDate")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.NAME_YEAR}>{t("formatNameYear")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_DATE}>{t("formatRandomDate")}</SelectItem>
                <SelectItem value={EMAIL_PREFIX_FORMATS.RANDOM_YEAR}>{t("formatRandomYear")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading} className="w-full">
        {tc("save")}
      </Button>
    </div>
  );
}
