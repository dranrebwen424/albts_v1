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
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
