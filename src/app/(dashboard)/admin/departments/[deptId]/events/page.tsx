'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getEvents } from '@/lib/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminEventsPage() {
  const params = useParams();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const e = await getEvents(params.deptId as string);
      setEvents(e);
      setLoading(false);
    };
    init();
  }, [params.deptId, router]);

  if (loading) {
    return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  }

  return (
    <div className="py-4 space-y-4">
      <p className="text-sm text-neutral-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>

      {events.map(event => (
        <button key={event.id} onClick={() => router.push(`/admin/departments/${params.deptId}/events/${event.id}`)} className="w-full text-left">
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
        </button>
      ))}
    </div>
  );
}
