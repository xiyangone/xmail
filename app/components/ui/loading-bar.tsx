"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LoadingBarProps {
  loading: boolean;
  className?: string;
}

export function LoadingBar({ loading, className }: LoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (progress === 0) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 h-1 bg-primary/20 z-50",
        className
      )}
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

