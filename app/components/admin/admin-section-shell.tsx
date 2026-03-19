"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AdminSectionShellProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AdminSectionShell({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: AdminSectionShellProps) {
  return (
    <section className={cn("theme-surface-admin-shell surface-panel overflow-hidden", className)}>
      <div className="theme-surface-admin-shell-header border-b border-border/60 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>

      <div className={cn("p-5 sm:p-6", contentClassName)}>{children}</div>
    </section>
  );
}
