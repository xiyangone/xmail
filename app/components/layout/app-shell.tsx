import { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  fullHeight?: boolean;
  containerClassName?: string;
  mainClassName?: string;
}

export function AppShell({
  children,
  fullHeight = false,
  containerClassName,
  mainClassName,
}: AppShellProps) {
  return (
    <div className={cn("relative min-h-screen", fullHeight && "h-dvh overflow-hidden")}>
      <div
        className={cn(
          "container mx-auto max-w-[1600px] px-4 lg:px-8",
          fullHeight && "flex h-full min-h-0 flex-col",
          containerClassName
        )}
      >
        <Header />
        <main
          className={cn(
            "relative",
            fullHeight
              ? "flex min-h-0 flex-1 flex-col pb-3 pt-[4.75rem]"
              : "pb-5 pt-[4.25rem]",
            mainClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
