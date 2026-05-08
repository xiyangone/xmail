"use client";

import { ReactNode } from "react";
import { PageTransition } from "@/components/layout/page-transition";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return <PageTransition>{children}</PageTransition>;
}
