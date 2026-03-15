"use client";

import { Logo } from "./logo";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showCTA?: boolean;
}

export function BrandHeader({
  title,
  subtitle,
  showCTA = true,
}: BrandHeaderProps) {
  const t = useTranslations("ui");
  const displayTitle = title ?? "XiYang Mail";
  const displaySubtitle = subtitle ?? t("brandSubtitle");

  return (
    <div className="text-center space-y-4 py-8">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {displayTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{displaySubtitle}</p>
      </div>
      {showCTA && (
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            {t("createMyMailbox")}
          </Link>
        </div>
      )}
    </div>
  );
}
