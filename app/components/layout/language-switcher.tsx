"use client";

import { Check, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 语言名以各自母语展示，无需走 i18n
const localeOptions = [
  { value: "zh", label: "简体中文", short: "中文" },
  { value: "en", label: "English", short: "EN" },
] as const;

export function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations("common");
  const locale = useLocale();

  const handleLocaleSelect = (next: string) => {
    if (next === locale) {
      return;
    }

    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${
      365 * 24 * 60 * 60
    };samesite=lax`;
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="plain"
          size="icon"
          className="surface-header-action h-10 w-10 !transition-colors duration-150 active:scale-100"
          title={t("switchLanguage")}
        >
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("switchLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="surface-panel-strong min-w-44 rounded-2xl p-2">
        {localeOptions.map(({ value, label, short }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => handleLocaleSelect(value)}
            className={`gap-3 rounded-xl px-3 py-2 text-sm focus:bg-primary/10 ${
              locale === value ? "bg-primary/10" : ""
            }`}
          >
            <span
              className={`flex h-6 w-10 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold tracking-wide transition-colors ${
                locale === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {short}
            </span>
            <span>{label}</span>
            {locale === value ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
