"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

interface SignButtonProps {
  size?: "default" | "lg";
}

export function SignButton({ size = "default" }: SignButtonProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const t = useTranslations("auth");

  if (loading) {
    return <div className="h-10 w-28" />;
  }

  if (!session?.user) {
    return (
      <Button
        variant="plain"
        onClick={() => router.push("/login")}
        className={cn("surface-header-accent gap-2", size === "lg" ? "px-8" : "px-4")}
        size={size}
      >
        <LogIn className={size === "lg" ? "w-5 h-5" : "w-4 h-4"} />
        {t("loginRegister")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2.5">
      <Link
        href="/profile"
        className="surface-header-link h-10 w-10 flex-none justify-center px-0 sm:w-auto sm:justify-start sm:px-2.5"
        title={session.user.name || t("userAvatar")}
        aria-label={session.user.name || t("userAvatar")}
      >
        <UserAvatar
          src={session.user.image}
          name={session.user.name}
          alt={session.user.name || t("userAvatar")}
          size={24}
          priority
          className="h-5 w-5 text-[10px] ring-1 ring-primary/20 sm:h-6 sm:w-6 sm:text-xs"
        />
        <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
          {session.user.name}
        </span>
      </Link>
      <Button
        variant="plain"
        onClick={() => signOut({ callbackUrl: "/" })}
        className={cn(
          "surface-header-action h-10 flex-shrink-0 rounded-full px-3",
          size === "lg" ? "sm:px-8" : "sm:px-4"
        )}
        title={t("logout")}
        aria-label={t("logout")}
        size={size}
      >
        {t("logout")}
      </Button>
    </div>
  );
}
