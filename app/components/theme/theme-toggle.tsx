"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Cherry, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

const themeOptions = [
  { value: "light", icon: Sun, labelKey: "themeLight" as const },
  { value: "dark", icon: Moon, labelKey: "themeDark" as const },
  { value: "sakura", icon: Cherry, labelKey: "themeSakura" as const },
  { value: "amber", icon: Palette, labelKey: "themeAmber" as const },
  { value: "system", icon: Monitor, labelKey: "themeSystem" as const },
] as const;

type ThemeValue = (typeof themeOptions)[number]["value"];
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => void;
};

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
  const [open, setOpen] = useState(false);
  const pendingTransitionFrame = useRef<number | null>(null);
  const t = useTranslations("ui");

  useEffect(() => {
    setMounted(true);

    return () => {
      if (pendingTransitionFrame.current !== null) {
        cancelAnimationFrame(pendingTransitionFrame.current);
      }
    };
  }, []);

  const applyThemeChange = (nextTheme: ThemeValue) => {
    if (!mounted) {
      setTheme(nextTheme);
      return;
    }

    const doc = document as DocumentWithViewTransition;
    const startViewTransition = doc.startViewTransition?.bind(doc);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    startViewTransition(async () => {
      flushSync(() => setTheme(nextTheme));
    });
  };

  const handleThemeSelect = (nextTheme: ThemeValue) => {
    flushSync(() => setOpen(false));

    if (theme === nextTheme) {
      return;
    }

    if (pendingTransitionFrame.current !== null) {
      cancelAnimationFrame(pendingTransitionFrame.current);
    }

    pendingTransitionFrame.current = requestAnimationFrame(() => {
      pendingTransitionFrame.current = null;
      applyThemeChange(nextTheme);
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="plain"
          size="icon"
          className="surface-header-action h-10 w-10 !transition-colors duration-150 active:scale-100"
        >
          {mounted ? <ThemeIcon resolvedTheme={resolvedTheme} /> : <Sun className="h-5 w-5" />}
          <span className="sr-only">{t("toggleTheme")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="surface-panel-strong min-w-44 rounded-2xl p-2">
        {themeOptions.map(({ value, icon: Icon, labelKey }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => handleThemeSelect(value)}
            className={`gap-3 rounded-xl px-3 py-2 text-sm focus:bg-primary/10 ${
              theme === value ? "bg-primary/10" : ""
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{t(labelKey)}</span>
            {theme === value ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
