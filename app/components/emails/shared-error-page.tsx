"use client";

import { AlertCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandHeader } from "@/components/ui/brand-header";

interface SharedErrorPageProps {
  status: 404 | 410;
  message?: string;
}

export function SharedErrorPage({ status, message }: SharedErrorPageProps) {
  const t = useTranslations("shared");
  const isExpired = status === 410;

  return (
    <div className="light theme-static-light page-gradient-background min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <BrandHeader showCTA={false} />

        <div className="bg-card border border-border rounded-lg p-8 shadow-lg space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {isExpired ? (
              <Clock className="h-16 w-16 text-orange-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-destructive" />
            )}

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">
                {isExpired ? t("linkExpired") : t("linkNotFound")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {message ||
                  (isExpired
                    ? t("linkExpiredDesc")
                    : t("linkNotFoundDesc"))}
              </p>
            </div>

            <div className="pt-4 space-y-2 text-xs text-muted-foreground">
              {isExpired ? (
                <>
                  <p>• {t("linkMayExpired")}</p>
                  <p>• {t("contactOwner")}</p>
                </>
              ) : (
                <>
                  <p>• {t("checkLink")}</p>
                  <p>• {t("linkMayDeleted")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
