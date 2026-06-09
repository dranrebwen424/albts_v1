'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getEvents, getReceipts, getNoReceiptForms } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { FileText, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const params = useParams();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const data = await getEvents(params.deptId as string);
      const enriched = await Promise.all(data.map(async (event: any) => {
        const [receipts, forms] = await Promise.all([
          getReceipts(event.id),
          getNoReceiptForms(event.id),
        ]);
        const approvedReceipts = receipts.filter((r: any) => r.status === 'approved');
        const approvedForms = forms.filter((f: any) => f.status === 'approved');
        const totalExpenses = [...approvedReceipts, ...approvedForms].reduce((sum: number, item: any) => sum + (item.total || item.amount || 0), 0);
        return { ...event, totalExpenses, receiptCount: approvedReceipts.length, formCount: approvedForms.length };
      }));
      setEvents(enriched);
      setLoading(false);
    };
    init();
  }, [params.deptId, router]);

  if (loading) return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="py-4 space-y-4">
      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-sm text-neutral-500 flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-neutral-300" />
            No reports available
          </CardContent>
        </Card>
      ) : events.map(event => (
        <button key={event.id} onClick={() => router.push(`/admin/departments/${params.deptId}/reports/${event.id}`)} className="w-full text-left">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{event.name}</CardTitle>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-neutral-500">Total Budget</p>
                  <p className="font-semibold">{formatCurrency(event.budget + event.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Total Expenses</p>
                  <p className="font-semibold">{formatCurrency(event.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Remaining</p>
                  <p className="font-semibold">{formatCurrency(event.budget)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Approved Items</p>
                  <p className="font-semibold">{event.receiptCount} receipts, {event.formCount} forms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      ))}
    </div>
  );
}
