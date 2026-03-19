export const APP_THEMES = ["light", "dark", "sakura", "amber"] as const;

export type AppTheme = (typeof APP_THEMES)[number];
export type BackgroundUrlKey = "bgLight" | "bgDark" | "bgSakura" | "bgAmber";
export type BackgroundEnabledKey =
  | "bgLightEnabled"
  | "bgDarkEnabled"
  | "bgSakuraEnabled"
  | "bgAmberEnabled";

export interface BackgroundSettingsConfig {
  bgEnabled: boolean;
  bgLight: string;
  bgDark: string;
  bgSakura: string;
  bgAmber: string;
  bgLightEnabled: boolean;
  bgDarkEnabled: boolean;
  bgSakuraEnabled: boolean;
  bgAmberEnabled: boolean;
}

export const defaultBackgroundSettings: BackgroundSettingsConfig = {
  bgEnabled: true,
  bgLight: "",
  bgDark: "",
  bgSakura: "",
  bgAmber: "",
  bgLightEnabled: true,
  bgDarkEnabled: true,
  bgSakuraEnabled: true,
  bgAmberEnabled: true,
};

export const backgroundThemeKeys: Record<
  AppTheme,
  { urlKey: BackgroundUrlKey; enabledKey: BackgroundEnabledKey }
> = {
  light: { urlKey: "bgLight", enabledKey: "bgLightEnabled" },
  dark: { urlKey: "bgDark", enabledKey: "bgDarkEnabled" },
  sakura: { urlKey: "bgSakura", enabledKey: "bgSakuraEnabled" },
  amber: { urlKey: "bgAmber", enabledKey: "bgAmberEnabled" },
};

export function resolveAppTheme(theme?: string): AppTheme {
  return APP_THEMES.includes(theme as AppTheme) ? (theme as AppTheme) : "light";
}

export interface ThemeIframeColors {
  text: string;
  bg: string;
  link: string;
  scrollbar: string;
}

export const THEME_IFRAME_COLORS: Record<AppTheme, ThemeIframeColors> = {
  light: { text: "#111827", bg: "#ffffff", link: "#2563eb", scrollbar: "37, 99, 235" },
  dark: { text: "#f5f3ff", bg: "#1a1a1a", link: "#a78bfa", scrollbar: "130, 109, 217" },
  sakura: { text: "#4a1942", bg: "#fff5f7", link: "#db2777", scrollbar: "219, 39, 119" },
  amber: { text: "#4a2c15", bg: "#fff7ed", link: "#c2410c", scrollbar: "234, 88, 12" },
};
