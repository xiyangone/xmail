"use client"

import { Skeleton } from "./skeleton"
import { useTranslations } from "next-intl"

export function EmailListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-primary/10">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MessageListSkeleton() {
  const t = useTranslations("common");
  return (
    <div className="relative">
      {/* 加载中提示 - 居中显示 */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="bg-background/95 backdrop-blur-sm px-6 py-3 rounded-lg border border-primary/20 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm font-medium text-foreground">{t("loading")}</span>
          </div>
        </div>
      </div>

      {/* 骨架屏 - 半透明显示 */}
      <div className="divide-y divide-primary/10 opacity-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-4 h-4 mt-1 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
