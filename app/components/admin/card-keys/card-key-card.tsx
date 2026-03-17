"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Mail,
  RefreshCw,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CardKey } from "@/hooks/use-card-keys";

interface CardKeyCardProps {
  cardKey: CardKey;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onCopy: (text: string) => void;
  onReset: (id: string) => void;
  onDelete: (type: "single", id: string) => void;
  status: { label: string; variant: "used" | "expired" | "expiring" | "unused" };
}

const statusConfig = {
  used: {
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  expired: {
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    icon: XCircle,
  },
  expiring: {
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
    icon: AlertCircle,
  },
  unused: {
    color: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    icon: Clock,
  },
} as const;

export function CardKeyCard({
  cardKey,
  selected,
  onToggleSelect,
  onCopy,
  onReset,
  onDelete,
  status,
}: CardKeyCardProps) {
  const t = useTranslations("cardKey");
  const cfg = statusConfig[status.variant];
  const StatusIcon = cfg.icon;

  return (
    <div
      className={cn(
        "surface-panel rounded-2xl p-5 transition-all",
        selected && "border-primary/50 shadow-primary/10"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <Checkbox checked={selected} onChange={() => onToggleSelect(cardKey.id)} className="mt-1" />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-xl bg-background/80 px-3 py-1.5 font-mono text-base font-semibold text-foreground">
                {cardKey.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(cardKey.code)}
                className="h-9 w-9 rounded-full"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  {cardKey.mode === "multi" && cardKey.emailAddress.includes(",") ? (
                    <>
                      <div className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                        {t("boundEmails", { count: cardKey.emailAddress.split(",").length })}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cardKey.emailAddress.split(",").map((email, index) => (
                          <code
                            key={`${cardKey.id}-${index}`}
                            className="rounded-lg bg-background/80 px-2 py-0.5 font-mono text-xs text-foreground"
                          >
                            {email.trim()}
                          </code>
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="font-medium text-foreground">{cardKey.emailAddress}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {t("created")}{" "}
                  {new Date(cardKey.createdAt).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {t("expires")}{" "}
                  {new Date(cardKey.expiresAt).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {cardKey.isUsed && cardKey.usedBy ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 shrink-0" />
                  <span>
                    {t("usedByLabel")}{" "}
                    <span className="font-medium text-foreground">
                      {cardKey.usedBy.name || cardKey.usedBy.username}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:ml-auto lg:flex-col lg:items-end">
          <Badge variant="secondary" className={`${cfg.color} gap-1.5 border-transparent px-3 py-1`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status.label}
          </Badge>

          <div className="flex gap-2">
            {cardKey.isUsed ? (
              <Button
                variant="outline"
                size="icon"
                onClick={() => onReset(cardKey.id)}
                className="h-9 w-9 rounded-full border-sky-500/25 text-sky-700 hover:bg-sky-500/10 hover:text-sky-700"
                title={t("resetTitle")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete("single", cardKey.id)}
              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
