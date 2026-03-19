import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeColorMeta } from "@/components/theme/theme-color-meta";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { jetBrainsMono } from "./fonts";
import "./globals.css";
import { Providers } from "./providers";
import { FloatMenu } from "@/components/float-menu";
import { BackgroundProvider } from "@/components/background/background-provider";
import { APP_THEMES } from "@/lib/background-config";
import { auth } from "@/lib/auth";

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
    authors: [{ name: "XiYang Mail" }],
    creator: "XiYang Mail",
    publisher: "XiYang Mail",
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
      url: "https://mail.xiyangone.cn",
      title,
      description,
      siteName: "XiYang Mail",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();

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
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    var cleanupKey = "__xmail_sw_cleanup_v1";

    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      if (!registrations.length) {
        try {
          sessionStorage.removeItem(cleanupKey);
        } catch {}
        return;
      }

      Promise.all(
        registrations.map(function (registration) {
          return registration.unregister().catch(function () {});
        })
      )
        .then(function () {
          if (!("caches" in window)) return;

          return caches.keys().then(function (keys) {
            return Promise.all(
              keys.map(function (key) {
                return caches.delete(key);
              })
            );
          });
        })
        .finally(function () {
          try {
            if (sessionStorage.getItem(cleanupKey) === "1") return;
            sessionStorage.setItem(cleanupKey, "1");
          } catch {}

          window.location.reload();
        });
    }).catch(function () {});
  } catch {}
})();`,
          }}
        />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={cn(
          jetBrainsMono.variable,
          "font-jetbrains min-h-screen antialiased",
          "bg-background text-foreground",
          "theme-color-transition"
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={[...APP_THEMES]}
          storageKey="temp-mail-theme"
        >
          <ThemeColorMeta />
          <NextIntlClientProvider messages={messages}>
            <Providers session={session}>
              <BackgroundProvider />
              {children}
            </Providers>
            <FloatMenu />
          </NextIntlClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
