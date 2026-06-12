'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEventsStore } from '@/stores/events';
import { getEvents, getReceipts, getNoReceiptForms, prefetchFsDetail } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/format';
import { FileText, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function ReportsPage() {
  const params = useParams();
  const deptId = params.deptId as string;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setFsDetailCache = useEventsStore(s => s.setFsDetailCache);
  const prefetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const data = await getEvents(deptId);
      const enriched = await Promise.all(data.map(async (event: any) => {
        const [receipts, forms] = await Promise.all([
          getReceipts(event.id),
          getNoReceiptForms(event.id),
        ]);
        const approvedReceipts = receipts.filter((r: any) => r.status === 'approved');
        const approvedForms = forms.filter((f: any) => f.status === 'approved');
        const totalExpenses = [...approvedReceipts, ...approvedForms].reduce((sum: number, item: any) => sum + (item.total || item.amount || 0), 0);

        // Batch-prefetch FS detail data
        if (!prefetchedIds.current.has(event.id)) {
          prefetchedIds.current.add(event.id);
          prefetchFsDetail(event.id).then(data => {
            setFsDetailCache(event.id, data);
          }).catch(() => {});
        }

        return { ...event, totalExpenses, receiptCount: approvedReceipts.length, formCount: approvedForms.length };
      }));
      setEvents(enriched);
      setLoading(false);
    };
    init();
  }, [deptId, setFsDetailCache]);

  if (loading) return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <motion.div variants={staggerContainer()} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="py-4 space-y-4">
      {events.length === 0 ? (
        <Card className="bg-surface-white rounded-xl shadow-sm">
          <CardContent className="text-center py-8 text-[13px] leading-[18px] text-text-secondary flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-text-placeholder" />
            No reports available
          </CardContent>
        </Card>
      ) : events.map((event, index) => (
        <motion.div {...fadeSlideUp(index)} key={event.id}>
          <Link href={`/admin/departments/${deptId}/reports/${event.id}`} prefetch={true} className="block w-full text-left">
            <Card className="hover:shadow-md transition-all cursor-pointer bg-surface-white rounded-xl shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">{event.name}</CardTitle>
                  <ChevronRight className="h-4 w-4 text-text-placeholder" />
                </div>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[15px] leading-[22px]">
                  <div>
                    <p className="text-[11px] leading-[14px] text-text-secondary">Total Budget</p>
                    <p className="text-[15px] leading-[22px] font-semibold">{formatCurrency(event.budget + event.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] leading-[14px] text-text-secondary">Total Expenses</p>
                    <p className="text-[15px] leading-[22px] font-semibold">{formatCurrency(event.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] leading-[14px] text-text-secondary">Remaining</p>
                    <p className="text-[15px] leading-[22px] font-semibold">{formatCurrency(event.budget)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] leading-[14px] text-text-secondary">Approved Items</p>
                    <p className="text-[15px] leading-[22px] font-semibold">{event.receiptCount} receipts, {event.formCount} forms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
