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
