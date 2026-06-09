'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEvents } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, FolderOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdviserEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const data = await getEvents(profile.department_id);
        setEvents(data);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Review and manage events</p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No events yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/adviser/events/${event.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.name}</CardTitle>
                    <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
                      {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 mt-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.officer?.first_name} {event.officer?.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-neutral-500" />
                    <span className="font-medium">{formatCurrency(event.budget)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
