'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getEventsWithFsStatus } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, FolderOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';

export default function AdviserEventsPage() {
  const events = useEventsStore(s => s.events);
  const setEvents = useEventsStore(s => s.setEvents);
  const profile = useAuthStore(s => s.profile);

  // Background refresh — store is already populated by sidebar prefetch
  useEffect(() => {
    if (!profile) return;
    getEventsWithFsStatus(profile.department_id).then(setEvents).catch(() => {});
  }, [profile, setEvents]);

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
