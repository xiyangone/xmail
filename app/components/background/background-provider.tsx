"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface BackgroundConfig {
  bgLight: string;
  bgDark: string;
  bgSakura: string;
}

interface UserBackgroundConfig extends BackgroundConfig {
  bgEnabled: boolean;
}

export function BackgroundProvider() {
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const [globalBg, setGlobalBg] = useState<BackgroundConfig | null>(null);
  const [userBg, setUserBg] = useState<UserBackgroundConfig | null>(null);

  useEffect(() => {
    fetch("/api/config/background")
      .then((res) => (res.ok ? (res.json() as Promise<BackgroundConfig>) : null))
      .then((data) => data && setGlobalBg(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/user/settings")
      .then((res) => (res.ok ? (res.json() as Promise<UserBackgroundConfig>) : null))
      .then((data) => data && setUserBg(data))
      .catch(() => {});
  }, [session?.user]);

  const themeKey = resolvedTheme === "dark" ? "bgDark" : resolvedTheme === "sakura" ? "bgSakura" : "bgLight";
  const backgroundUrl =
    userBg && !userBg.bgEnabled ? "" : userBg?.[themeKey] || globalBg?.[themeKey] || "";

  if (!backgroundUrl) {
    return <div className="page-gradient-background fixed inset-0 -z-10" />;
  }

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "hsl(var(--background) / var(--background-overlay-opacity))",
          backdropFilter: "blur(var(--background-overlay-blur))",
        }}
      />
    </div>
  );
}
