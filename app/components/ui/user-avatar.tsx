"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  alt: string;
  size: number;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function UserAvatar({
  src,
  name,
  alt,
  size,
  priority = false,
  className,
  imageClassName,
  fallbackClassName,
}: UserAvatarProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = (name?.trim().slice(0, 1) || "?").toUpperCase();
  const showImage = Boolean(src && failedSrc !== src);
  const imageLoaded = Boolean(src && loadedSrc === src);

  return (
    <span
      className={cn(
        "relative inline-flex flex-none items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn("select-none font-semibold leading-none", fallbackClassName)}
      >
        {initial}
      </span>
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          sizes={`${size}px`}
          priority={priority}
          unoptimized
          onLoad={() => setLoadedSrc(src!)}
          onError={() => setFailedSrc(src!)}
          className={cn(
            "object-cover transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
        />
      ) : null}
    </span>
  );
}
