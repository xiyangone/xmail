"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const localeLabels: Record<string, string> = {
  zh: "中文",
  en: "EN",
};

function getCurrentLocale(): string {
  if (typeof document === "undefined") return "zh";
  const match = document.cookie.match(/NEXT_LOCALE=(\w+)/);
  return match?.[1] || "zh";
}

export function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations("common");

  const toggleLocale = () => {
    const current = getCurrentLocale();
    const next = current === "zh" ? "en" : "zh";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${365 * 24 * 60 * 60}`;
    router.refresh();
  };

  const current = getCurrentLocale();
  const nextLocale = current === "zh" ? "en" : "zh";

  return (
    <button
      onClick={toggleLocale}
      className="inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      title={t("switchLanguage")}
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">{localeLabels[nextLocale]}</span>
    </button>
  );
}
