import { Suspense } from 'react';
import Link from 'next/link';
import { getFsDetailData } from '@/lib/actions';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminReportDetailClient } from './report-detail-client';

export default async function AdminReportDetailPage({ params }: { params: Promise<{ deptId: string; eventId: string }> }) {
  const { deptId, eventId } = await params;

  const data = await getFsDetailData(eventId).catch(() => null);

  return (
    <Suspense fallback={<ReportDetailSkeleton />}>
      <AdminReportDetailClient
        deptId={deptId}
        eventId={eventId}
        data={data}
      />
    </Suspense>
  );
}

function ReportDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 rounded-lg bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />)}
      </div>
      <div className="h-64 rounded-xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
    </div>
  );
}
