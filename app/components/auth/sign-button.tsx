"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";
import Image from "next/image";
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
    <div className="flex items-center gap-2.5">
      <Link href="/profile" className="surface-header-link min-w-0">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || t("userAvatar")}
            width={24}
            height={24}
            className="rounded-full ring-1 ring-primary/20"
          />
        )}
        <span className="max-w-28 truncate text-sm font-medium">{session.user.name}</span>
      </Link>
      <Button
        variant="plain"
        onClick={() => signOut({ callbackUrl: "/" })}
        className={cn("surface-header-action flex-shrink-0 rounded-full", size === "lg" ? "px-8" : "px-4")}
        size={size}
      >
        {t("logout")}
      </Button>
    </div>
  );
}
