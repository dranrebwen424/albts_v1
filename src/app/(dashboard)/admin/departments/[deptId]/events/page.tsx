'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEventsStore } from '@/stores/events';
import { getEvents, prefetchEventDetail } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, CaretRight} from '@phosphor-icons/react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function AdminEventsPage() {
  const params = useParams();
  const deptId = params.deptId as string;
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const setEventDetailCache = useEventsStore(s => s.setEventDetailCache);
  const prefetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const e = await getEvents(deptId);
      setEvents(e);

      e.forEach((event: any) => {
        if (prefetchedIds.current.has(event.id)) return;
        prefetchedIds.current.add(event.id);
        prefetchEventDetail(event.id).then(data => {
          setEventDetailCache(event.id, data);
        }).catch(() => {});
      });

      setLoading(false);
    };
    init();
  }, [deptId, setEventDetailCache]);

  if (loading) {
    return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <motion.div variants={staggerContainer()} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="py-4 space-y-4">
      <p className="text-[13px] leading-[18px] text-text-secondary">{events.length} event{events.length !== 1 ? 's' : ''}</p>

      {events.map((event, index) => (
        <motion.div {...fadeSlideUp(index)} key={event.id}>
          <Link href={`/admin/departments/${deptId}/events/${event.id}`} prefetch={true} className="block w-full text-left">
            <Card className="hover:shadow-md transition-all cursor-pointer bg-surface-white rounded-xl shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] leading-[22px] font-medium">{event.name}</span>
                    <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>{event.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-[11px] leading-[14px] text-text-secondary">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.officer?.first_name} {event.officer?.last_name}</span>
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {formatCurrency(event.original_budget)}</span>
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                </div>
                <CaretRight className="h-4 w-4 text-text-placeholder" />
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
