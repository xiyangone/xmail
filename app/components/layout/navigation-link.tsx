"use client";

import { Loader2 } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function PendingLabel() {
  const t = useTranslations("common");
  return <span className="sr-only">{t("loading")}</span>;
}

function NavigationContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <>
      {children}
      <span
        role="status"
        aria-hidden={!pending}
        className={cn("pointer-events-none absolute right-1 top-1 h-3 w-3", pending ? "opacity-100" : "opacity-0")}
      >
        <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {pending && <PendingLabel />}
      </span>
    </>
  );
}

export const NavigationLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(
  function NavigationLink({ children, className, ...props }, ref) {
    return (
      <Link ref={ref} className={cn("relative", className)} {...props}>
        <NavigationContent>{children}</NavigationContent>
      </Link>
    );
  }
);
