import Link from 'next/link';
import { getEvent, getReceipts, getNoReceiptForms, getFinancialReport } from '@/lib/actions';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { ArrowLeft } from 'lucide-react';
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

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum: number, item: any) => sum + (item.total || item.amount || 0), 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/adviser/events" prefetch={true} className="text-text-secondary hover:text-text-primary transition-colors duration-150">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">{event.name}</h1>
          <p className="page-description">
            Budget: {formatCurrency((event.budget || 0) + totalExpenses)} | Used: {formatCurrency(totalExpenses)} | Remaining: <span className={event.budget < 0 ? 'text-error font-[590]' : ''}>{formatCurrency(event.budget || 0)}</span>
          </p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      <AdviserEventDetailClient
        eventId={eventId}
        initialEvent={event}
        initialReceipts={receipts}
        initialForms={forms}
        initialReport={report}
      />
    </div>
  );
}
