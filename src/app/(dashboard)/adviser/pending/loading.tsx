import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    </div>
  );
}
