import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  const messages =
    locale === "en"
      ? (await import("../messages/en.json")).default
      : (await import("../messages/zh.json")).default;

  return {
    locale,
    messages,
  };
});
