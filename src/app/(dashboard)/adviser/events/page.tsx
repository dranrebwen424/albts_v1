'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getEventsWithFsStatus, prefetchEventDetail } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, FolderOpen} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function AdviserEventsPage() {
  const events = useEventsStore(s => s.events);
  const setEvents = useEventsStore(s => s.setEvents);
  const setEventDetailCache = useEventsStore(s => s.setEventDetailCache);
  const profile = useAuthStore(s => s.profile);
  const prefetchedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    events.forEach(event => {
      if (prefetchedIds.current.has(event.id)) return;
      prefetchedIds.current.add(event.id);
      prefetchEventDetail(event.id).then(data =>
        setEventDetailCache(event.id, data)
      ).catch(() => {});
    });
  }, [events, setEventDetailCache]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Events</h1>
        <p className="page-description">Review and manage department events</p>
      </div>

      {events.length === 0 ? (
        <Card className="bg-surface-white shadow-soft rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-text-placeholder mb-4" />
            <p className="text-[13px] leading-[18px] text-text-secondary">No events yet</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event, index) => (
            <motion.div {...fadeSlideUp(index)} key={event.id}>
            <Link href={`/adviser/events/${event.id}`} prefetch={true}
              onMouseEnter={() => {
                prefetchEventDetail(event.id).then(data =>
                  setEventDetailCache(event.id, data)
                ).catch(() => {});
              }}>
              <Card className="h-full bg-surface-white shadow-soft rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
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
                  <div className="flex items-center gap-2 text-[13px] leading-[18px]">
                    <Wallet className="h-4 w-4 text-text-secondary" />
                    <span className="font-medium text-text-primary">{formatCurrency(event.original_budget)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
