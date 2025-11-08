import { Skeleton } from "./skeleton"

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
  return (
    <div className="divide-y divide-primary/10">
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
  )
}
