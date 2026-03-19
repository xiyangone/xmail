"use client";

import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-3 rounded-full px-1 py-1 transition-transform duration-300 hover:-translate-y-0.5"
    >
      <span className="surface-header-action relative flex h-10 w-10 items-center justify-center overflow-hidden p-0 shadow-[0_10px_24px_hsl(var(--primary)/0.14)]">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary-light)/0.32),transparent_62%)]" />
        <Image
          src="/cat.svg"
          alt="XiYang Mail Logo"
          width={32}
          height={32}
          className="relative h-7 w-7 transition-transform duration-300 group-hover:scale-105"
        />
      </span>
      <span className="leading-none">
        <span className="block bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] bg-clip-text text-sm font-bold tracking-[0.24em] text-transparent sm:text-base">
          XIYANG
        </span>
        <span className="hidden text-[10px] tracking-[0.32em] text-muted-foreground/85 sm:block">
          MAILBOX
        </span>
      </span>
    </Link>
  );
}
