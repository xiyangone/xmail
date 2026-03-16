"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const localeLabels: Record<string, string> = {
  zh: "中文",
  en: "EN",
};

export function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations("common");
  const locale = useLocale();

  const toggleLocale = () => {
    const current = locale;
    const next = current === "zh" ? "en" : "zh";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${
      365 * 24 * 60 * 60
    };samesite=lax`;
    router.refresh();
  };

  const current = locale;
  const nextLocale = current === "zh" ? "en" : "zh";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className="gap-2 rounded-full px-3"
      title={`${t("switchLanguage")}: ${localeLabels[nextLocale]}`}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline text-xs font-semibold tracking-wide">
        {localeLabels[current] ?? current}
      </span>
    </Button>
  );
}
