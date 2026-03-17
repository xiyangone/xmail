"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface CardKeyGenerateDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  cardKeyMode: "single" | "multi";
  setCardKeyMode: (mode: "single" | "multi") => void;
  emailAddresses: string;
  setEmailAddresses: (v: string) => void;
  multiEmailAddresses: string;
  setMultiEmailAddresses: (v: string) => void;
  expiryValue: string;
  setExpiryValue: (v: string) => void;
  expiryUnit: "minutes" | "hours" | "days";
  setExpiryUnit: (v: "minutes" | "hours" | "days") => void;
  allowedDomains: string[];
  generating: boolean;
  onGenerate: () => void;
}

export function CardKeyGenerateDialog({
  dialogOpen, setDialogOpen, cardKeyMode, setCardKeyMode,
  emailAddresses, setEmailAddresses, multiEmailAddresses, setMultiEmailAddresses,
  expiryValue, setExpiryValue, expiryUnit, setExpiryUnit,
  allowedDomains, generating, onGenerate,
}: CardKeyGenerateDialogProps) {
  const t = useTranslations("cardKey");

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("generateCardKeys")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("generateTitle")}</DialogTitle>
          <DialogDescription className="text-sm">{t("dialogDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">{t("cardKeyType")}</Label>
            </div>
            <Select value={cardKeyMode} onValueChange={(value: "single" | "multi") => setCardKeyMode(value)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">{t("singleMode")}</span>
                    <span className="text-xs text-muted-foreground">{t("singleModeDesc")}</span>
                  </div>
                </SelectItem>
                <SelectItem value="multi">
                  <div className="flex flex-col items-start py-1">
                    <span className="font-medium">{t("multiMode")}</span>
                    <span className="text-xs text-muted-foreground">{t("multiModeDesc")}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="bg-muted/50 rounded-lg p-3 border border-muted">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cardKeyMode === "single" ? `💡 ${t("singleModeTip")}` : `💡 ${t("multiModeTip")}`}
              </p>
            </div>
          </div>

          {cardKeyMode === "single" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="emails" className="text-sm font-semibold">{t("emailListLabel")}</Label>
                <p className="text-xs text-muted-foreground mt-1">{t("singleEmailHint")}</p>
              </div>
              <Textarea
                id="emails"
                placeholder={`user1@${allowedDomains[0] || "example.com"}\nuser2@${allowedDomains[0] || "example.com"}\nuser3@${allowedDomains[0] || "example.com"}`}
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              {allowedDomains.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-semibold">{t("allowedDomains")}</span>
                    {allowedDomains.map((domain, index) => (
                      <span key={domain}>
                        {index > 0 && ", "}
                        <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">@{domain}</code>
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          )}

          {cardKeyMode === "multi" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="multi-emails" className="text-sm font-semibold">{t("emailListLabel")}</Label>
                <p className="text-xs text-muted-foreground mt-1">{t("multiEmailHint")}</p>
              </div>
              <Textarea
                id="multi-emails"
                placeholder={`1@${allowedDomains[0] || "example.com"}\n2@${allowedDomains[0] || "example.com"}\n3@${allowedDomains[0] || "example.com"}`}
                value={multiEmailAddresses}
                onChange={(e) => setMultiEmailAddresses(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {allowedDomains.length > 0 && (
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-900">
                  <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                    <span className="font-semibold">{t("allowedDomains")}</span>
                    {allowedDomains.map((domain, index) => (
                      <span key={domain}>
                        {index > 0 && ", "}
                        <code className="bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">@{domain}</code>
                      </span>
                    ))}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">💡{t("multiCardKeyTip")}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="expiry" className="text-sm font-semibold">{t("expiryLabel")}</Label>
              <p className="text-xs text-muted-foreground mt-1">{t("expiryHint")}</p>
            </div>
            <div className="flex gap-3">
              <Input
                id="expiry"
                type="number"
                min="1"
                value={expiryValue}
                onChange={(e) => setExpiryValue(e.target.value)}
                className="flex-1 h-11"
                placeholder={t("expiryPlaceholder")}
              />
              <Select value={expiryUnit} onValueChange={(value: "minutes" | "hours" | "days") => setExpiryUnit(value)}>
                <SelectTrigger className="w-28 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">{t("minutes")}</SelectItem>
                  <SelectItem value="hours">{t("hours")}</SelectItem>
                  <SelectItem value="days">{t("days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={onGenerate} disabled={generating} className="w-full h-11 text-base font-medium" size="lg">
            {generating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {generating ? t("generating") : t("generateCardKeys")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
