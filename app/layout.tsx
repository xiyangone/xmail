import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { jetBrainsMono } from "./fonts";
import "./globals.css";
import { Providers } from "./providers";
import { FloatMenu } from "@/components/float-menu";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("metadata");
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    keywords: [
      "临时邮箱",
      "一次性邮箱",
      "匿名邮箱",
      "隐私保护",
      "垃圾邮件过滤",
      "即时收件",
      "自动过期",
      "安全邮箱",
      "注册验证",
      "临时账号",
      "萌系邮箱",
      "电子邮件",
      "隐私安全",
      "邮件服务",
      "XiYang Mail",
    ].join(", "),
    authors: [{ name: "SoftMoe Studio" }],
    creator: "SoftMoe Studio",
    publisher: "SoftMoe Studio",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "zh_CN",
      url: "https://moemail.app",
      title,
      description,
      siteName: "XiYang Mail",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    manifest: "/manifest.json",
    icons: [{ rel: "apple-touch-icon", url: "/icons/icon-192x192.png" }],
  };
}

export const viewport: Viewport = {
  themeColor: "#FF8A3D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    if (typeof globalThis.__name === "function") return;
    globalThis.__name = function (target, value) {
      try {
        Object.defineProperty(target, "name", { value, configurable: true });
      } catch {}
      return target;
    };
  } catch {}
})();`,
          }}
        />
        <meta name="application-name" content="XiYang Mail" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="XiYang Mail" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={cn(
          jetBrainsMono.variable,
          "font-jetbrains min-h-screen antialiased",
          "bg-background text-foreground",
          "transition-colors duration-300"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={["light", "dark", "sakura"]}
          disableTransitionOnChange={false}
          storageKey="temp-mail-theme"
        >
          <NextIntlClientProvider messages={messages}>
            <Providers>{children}</Providers>
            <FloatMenu />
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
