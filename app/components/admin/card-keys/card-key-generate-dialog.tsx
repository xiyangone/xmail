"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CardKeyGenerateDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  cardKeyMode: "single" | "multi";
  setCardKeyMode: (mode: "single" | "multi") => void;
  emailAddresses: string;
  setEmailAddresses: (value: string) => void;
  multiEmailAddresses: string;
  setMultiEmailAddresses: (value: string) => void;
  expiryValue: string;
  setExpiryValue: (value: string) => void;
  expiryUnit: "minutes" | "hours" | "days";
  setExpiryUnit: (value: "minutes" | "hours" | "days") => void;
  allowedDomains: string[];
  generating: boolean;
  onGenerate: () => void;
}

export function CardKeyGenerateDialog({
  dialogOpen,
  setDialogOpen,
  cardKeyMode,
  setCardKeyMode,
  emailAddresses,
  setEmailAddresses,
  multiEmailAddresses,
  setMultiEmailAddresses,
  expiryValue,
  setExpiryValue,
  expiryUnit,
  setExpiryUnit,
  allowedDomains,
  generating,
  onGenerate,
}: CardKeyGenerateDialogProps) {
  const t = useTranslations("cardKey");
  const primaryDomain = allowedDomains[0] || "example.com";

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          {t("generateCardKeys")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t("generateTitle")}</DialogTitle>
          <DialogDescription className="text-sm">{t("dialogDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <section className="space-y-3">
            <Label className="text-sm font-semibold">{t("cardKeyType")}</Label>
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

            <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
              <strong className="block text-foreground">Tip</strong>
              <p className="mt-2 leading-6">
                {cardKeyMode === "single" ? t("singleModeTip") : t("multiModeTip")}
              </p>
            </div>
          </section>

          {cardKeyMode === "single" ? (
            <section className="space-y-3">
              <div>
                <Label htmlFor="card-key-single-emails" className="text-sm font-semibold">
                  {t("emailListLabel")}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{t("singleEmailHint")}</p>
              </div>

              <Textarea
                id="card-key-single-emails"
                placeholder={`user1@${primaryDomain}\nuser2@${primaryDomain}\nuser3@${primaryDomain}`}
                value={emailAddresses}
                onChange={(event) => setEmailAddresses(event.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </section>
          ) : (
            <section className="space-y-3">
              <div>
                <Label htmlFor="card-key-multi-emails" className="text-sm font-semibold">
                  {t("emailListLabel")}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{t("multiEmailHint")}</p>
              </div>

              <Textarea
                id="card-key-multi-emails"
                placeholder={`ops@${primaryDomain}\nqa@${primaryDomain}\nreview@${primaryDomain}`}
                value={multiEmailAddresses}
                onChange={(event) => setMultiEmailAddresses(event.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </section>
          )}

          {allowedDomains.length > 0 ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <strong className="block text-foreground">{t("allowedDomains")}</strong>
              <div className="mt-2 flex flex-wrap gap-2">
                {allowedDomains.map((domain) => (
                  <code key={domain} className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                    @{domain}
                  </code>
                ))}
              </div>

              {cardKeyMode === "multi" ? (
                <p className="mt-3 leading-6">{t("multiCardKeyTip")}</p>
              ) : null}
            </div>
          ) : null}

          <section className="space-y-3">
            <div>
              <Label htmlFor="card-key-expiry" className="text-sm font-semibold">
                {t("expiryLabel")}
              </Label>
              <p className="mt-1 text-xs text-muted-foreground">{t("expiryHint")}</p>
            </div>

            <div className="flex gap-3">
              <Input
                id="card-key-expiry"
                type="number"
                min="1"
                value={expiryValue}
                onChange={(event) => setExpiryValue(event.target.value)}
                className="h-11 flex-1"
                placeholder={t("expiryPlaceholder")}
              />
              <Select value={expiryUnit} onValueChange={(value: "minutes" | "hours" | "days") => setExpiryUnit(value)}>
                <SelectTrigger className="h-11 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">{t("minutes")}</SelectItem>
                  <SelectItem value="hours">{t("hours")}</SelectItem>
                  <SelectItem value="days">{t("days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <Button
            onClick={onGenerate}
            disabled={generating}
            size="lg"
            className="h-11 w-full rounded-2xl text-base font-medium"
          >
            {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            {generating ? t("generating") : t("generateCardKeys")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
