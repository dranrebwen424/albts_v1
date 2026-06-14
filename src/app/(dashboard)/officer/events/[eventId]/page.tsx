import { getEvent, getReceipts, getNoReceiptForms } from '@/lib/actions';
import { EventDetailClient } from './event-detail-client';

export default async function OfficerEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;

    const [event, receipts, forms] = await Promise.all([
      getEvent(eventId).catch(() => null),
      getReceipts(eventId).catch(() => [] as any[]),
      getNoReceiptForms(eventId).catch(() => [] as any[]),
    ]);

    if (!event) return <div className="text-text-body text-[15px] leading-[22px]">Event not found</div>;

    return (
      <EventDetailClient
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
