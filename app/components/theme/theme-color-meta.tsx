"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { resolveAppTheme } from "@/lib/background-config";

const THEME_COLORS: Record<string, string> = {
  light: "#F5862A",
  dark: "#8B5CF6",
  sakura: "#E84393",
  amber: "#E8850F",
};

export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const theme = resolveAppTheme(resolvedTheme);
    const color = THEME_COLORS[theme] || THEME_COLORS.light;

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [resolvedTheme]);

  return null;
}
