'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEventsStore } from '@/stores/events';
import { getEvents, prefetchEventDetail } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="py-4 space-y-4">
      <p className="text-sm text-neutral-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>

      {events.map(event => (
        <Link key={event.id} href={`/admin/departments/${deptId}/events/${event.id}`} prefetch={true} className="block w-full text-left">
          <Card className="hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{event.name}</span>
                  <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>{event.status}</Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.officer?.first_name} {event.officer?.last_name}</span>
                  <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> {formatCurrency(event.budget)}</span>
                  <span>{formatDate(event.created_at)}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
