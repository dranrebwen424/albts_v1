import Link from 'next/link';
import { getEvent, getReceipts, getNoReceiptForms } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { ArrowLeft } from 'lucide-react';
import { EventDetailClient } from './event-detail-client';

export default async function OfficerEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const [event, receipts, forms] = await Promise.all([
    getEvent(eventId).catch(() => null),
    getReceipts(eventId).catch(() => [] as any[]),
    getNoReceiptForms(eventId).catch(() => [] as any[]),
  ]);

  if (!event) return <div>Event not found</div>;

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum: number, item: any) => sum + (item.total || item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/officer/events" prefetch={true} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Budget: {formatCurrency((event.budget || 0) + totalExpenses)} | Used: {formatCurrency(totalExpenses)} | Remaining: <span className={event.budget < 0 ? 'text-red-500 font-semibold' : ''}>{formatCurrency(event.budget || 0)}</span>
          </p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      <EventDetailClient
        eventId={eventId}
        initialEvent={event}
        initialReceipts={receipts}
        initialForms={forms}
      />
    </div>
  );
}
