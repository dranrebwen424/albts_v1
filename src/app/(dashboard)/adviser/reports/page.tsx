'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEventsWithFsStatus } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Calendar, FolderOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile } from '@/types';

export default function AdviserReportsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prof) {
        const data = await getEventsWithFsStatus(prof.department_id);
        setEvents(data);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  function getStatusInfo(event: any) {
    if (event.status === 'done') {
      return { label: 'Completed', variant: 'success' as const };
    }
    if (event.hasFsRecord) {
      return { label: 'FS Generated', variant: 'secondary' as const };
    }
    if (event.canGenerateFs) {
      return { label: 'Ready to Generate', variant: 'success' as const };
    }
    return { label: 'Ongoing', variant: 'warning' as const };
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Overview of all events and their financial statement status
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No events found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const status = getStatusInfo(event);
            return (
              <Link key={event.id} href={`/adviser/reports/${event.id}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{event.name}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1.5 mt-1">
                      <Users className="h-3.5 w-3.5" />
                      {event.officer?.first_name} {event.officer?.last_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {new Date(event.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-neutral-500" />
                      <span className="text-neutral-600 dark:text-neutral-400">
                        {event.formCount > 0
                          ? `${event.pendingFormCount} pending / ${event.formCount} total no-receipt forms`
                          : 'No no-receipt forms'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
