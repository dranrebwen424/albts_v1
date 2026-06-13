import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Skeleton className="h-9 w-40 rounded-lg" />
      <div className="bg-surface-white rounded-xl shadow-soft p-6 space-y-5">
        <div className="flex items-start gap-5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-surface-white rounded-xl shadow-soft p-6 space-y-5">
        <Skeleton className="h-6 w-36" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-surface-white rounded-xl shadow-soft p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
    </div>
  );
}
