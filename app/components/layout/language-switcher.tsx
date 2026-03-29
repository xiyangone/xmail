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
      variant="plain"
      size="sm"
      onClick={toggleLocale}
      className="surface-header-action h-10 w-10 rounded-full px-0 sm:w-auto sm:gap-2 sm:px-3.5"
      title={`${t("switchLanguage")}: ${localeLabels[nextLocale]}`}
      aria-label={`${t("switchLanguage")}: ${localeLabels[nextLocale]}`}
    >
      <Globe className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline text-xs font-semibold tracking-wide">
        {localeLabels[current] ?? current}
      </span>
    </Button>
  );
}
