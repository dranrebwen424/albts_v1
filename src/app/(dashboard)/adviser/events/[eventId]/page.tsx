import { getEvent, getReceipts, getNoReceiptForms, getFinancialReport } from '@/lib/actions';
import { AdviserEventDetailClient } from './event-detail-client';

export default async function AdviserEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const [event, receipts, forms, report] = await Promise.all([
    getEvent(eventId).catch(() => null),
    getReceipts(eventId).catch(() => [] as any[]),
    getNoReceiptForms(eventId).catch(() => [] as any[]),
    getFinancialReport(eventId).catch(() => null),
  ]);

  if (!event) return <div className="text-text-body text-[15px] leading-[22px]">Event not found</div>;

  return (
    <AdviserEventDetailClient
      eventId={eventId}
      initialEvent={event}
      initialReceipts={receipts}
      initialForms={forms}
      initialReport={report}
    />
  );
}
