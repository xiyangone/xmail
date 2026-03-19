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
    <div className={cn("relative min-h-screen", fullHeight && "h-[100dvh] overflow-hidden")}>
      <div
        className={cn(
          "container mx-auto max-w-[1600px] px-4 lg:px-8",
          fullHeight && "h-full",
          containerClassName
        )}
      >
        <Header />
        <main
          className={cn(
            "relative",
            fullHeight ? "mt-[4.25rem] h-[calc(100dvh-4.25rem-0.5rem)] min-h-0 pb-2" : "pb-5 pt-[4.25rem]",
            mainClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
