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
    <div className={cn("relative min-h-screen", fullHeight && "h-screen")}>
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
            "relative pb-5 pt-[4.75rem]",
            fullHeight && "h-[calc(100vh-5rem)]",
            mainClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
