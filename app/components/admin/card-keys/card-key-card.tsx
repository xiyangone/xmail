"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy, Trash2, Mail, Calendar, Clock, User,
  RefreshCw, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import type { CardKey } from "@/hooks/use-card-keys";
import { useTranslations } from "next-intl";

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
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: CheckCircle2,
  },
  expired: {
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: XCircle,
  },
  expiring: {
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: AlertCircle,
  },
  unused: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: Clock,
  },
} as const;

export function CardKeyCard({
  cardKey, selected, onToggleSelect, onCopy, onReset, onDelete, status,
}: CardKeyCardProps) {
  const t = useTranslations("cardKey");
  const cfg = statusConfig[status.variant];
  const StatusIcon = cfg.icon;

  return (
    <Card className={selected ? "border-primary" : ""}>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex items-start pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(cardKey.id)}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
          </div>

          <div className="flex-1 flex justify-between items-start gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <code className="bg-muted px-3 py-1.5 rounded text-base font-mono font-semibold">
                  {cardKey.code}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(cardKey.code)}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {cardKey.mode === "multi" && cardKey.emailAddress.includes(",") ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-foreground mb-1">
                          {t("boundEmails", { count: cardKey.emailAddress.split(",").length })}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cardKey.emailAddress.split(",").map((email, index) => (
                            <code key={index} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {email.trim()}
                            </code>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="font-medium text-foreground">{cardKey.emailAddress}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {t("created")}{" "}
                    {new Date(cardKey.createdAt).toLocaleString("zh-CN", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {t("expires")}{" "}
                    {new Date(cardKey.expiresAt).toLocaleString("zh-CN", {
                      year: "numeric", month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {cardKey.isUsed && cardKey.usedBy && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {t("usedByLabel")}{" "}
                      <span className="font-medium text-foreground">
                        {cardKey.usedBy.name || cardKey.usedBy.username}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge className={`${cfg.color} gap-1 px-2 py-1`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
              <div className="flex gap-1">
                {cardKey.isUsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReset(cardKey.id)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title={t("resetTitle")}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete("single", cardKey.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
