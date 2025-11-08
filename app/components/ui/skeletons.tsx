import { Skeleton } from "@/components/ui/skeleton"

export function EmailListSkeleton() {
  return (
    <div className="space-y-1 p-2 animate-fade-in">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  )
}

export function MessageListSkeleton() {
  return (
    <div className="space-y-2 p-2 animate-fade-in">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border">
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardListSkeleton() {
  return (
    <div className="grid gap-4 animate-fade-in">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-6 rounded-lg border">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
