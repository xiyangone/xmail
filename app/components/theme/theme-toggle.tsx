"use client";

import { Cherry, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themeOptions = [
  { value: "light", icon: Sun, labelKey: "themeLight" as const },
  { value: "dark", icon: Moon, labelKey: "themeDark" as const },
  { value: "sakura", icon: Cherry, labelKey: "themeSakura" as const },
  { value: "amber", icon: Palette, labelKey: "themeAmber" as const },
  { value: "system", icon: Monitor, labelKey: "themeSystem" as const },
] as const;

function ThemeIcon({ resolvedTheme }: { resolvedTheme?: string }) {
  switch (resolvedTheme) {
    case "dark":
      return <Moon className="h-5 w-5" />;
    case "sakura":
      return <Cherry className="h-5 w-5" />;
    case "amber":
      return <Palette className="h-5 w-5" />;
    default:
      return <Sun className="h-5 w-5" />;
  }
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("ui");

  useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-transparent bg-background/35 text-foreground backdrop-blur-md hover:border-primary/20 hover:bg-background/65"
        >
          {mounted ? <ThemeIcon resolvedTheme={resolvedTheme} /> : <Sun className="h-5 w-5" />}
          <span className="sr-only">{t("toggleTheme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-40 rounded-2xl border-border/60 bg-background/92 p-2 backdrop-blur-xl"
      >
        {themeOptions.map(({ value, icon: Icon, labelKey }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="gap-3 rounded-xl px-3 py-2 text-sm"
          >
            <Icon className="h-4 w-4" />
            <span>{t(labelKey)}</span>
            {theme === value ? <span className="ml-auto text-primary">✓</span> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
