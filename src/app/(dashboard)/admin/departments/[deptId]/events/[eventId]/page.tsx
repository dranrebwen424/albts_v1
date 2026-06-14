import { getEvent, getReceipts, getNoReceiptForms } from '@/lib/actions';
import { AdminEventDetailClient } from './event-detail-client';

export default async function AdminEventDetailPage({ params }: { params: Promise<{ deptId: string; eventId: string }> }) {
  try {
    const { deptId, eventId } = await params;

    const [event, receipts, forms] = await Promise.all([
      getEvent(eventId).catch(() => null),
      getReceipts(eventId).catch(() => [] as any[]),
      getNoReceiptForms(eventId).catch(() => [] as any[]),
    ]);

    if (!event) return <div className="py-8 text-[13px] leading-[18px] text-text-secondary">Event not found.</div>;

    return (
      <AdminEventDetailClient
        deptId={deptId}
        eventId={eventId}
        initialEvent={event}
        initialReceipts={receipts}
        initialForms={forms}
      />
    );
  } catch {
    return <div className="py-8 text-[13px] leading-[18px] text-text-secondary">Failed to load event details. Please try again.</div>;
  }
}
