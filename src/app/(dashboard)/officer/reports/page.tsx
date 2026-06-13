'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useEventsStore } from '@/stores/events';
import { prefetchFsDetail } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Calendar, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function OfficerReportsPage() {
  const events = useEventsStore(s => s.events);
  const setFsDetailCache = useEventsStore(s => s.setFsDetailCache);
  const prefetchedIds = useRef<Set<string>>(new Set());

  // Batch-prefetch all FS details when list loads → instant navigation
  useEffect(() => {
    events.forEach(event => {
      if (prefetchedIds.current.has(event.id)) return;
      prefetchedIds.current.add(event.id);
      prefetchFsDetail(event.id).then(data =>
        setFsDetailCache(event.id, data)
      ).catch(() => {});
    });
  }, [events, setFsDetailCache]);

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

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Financial Reports</h1>
        <p className="page-description">Overview of all events and their financial statement status</p>
      </div>

      {events.length === 0 ? (
        <Card className="bg-surface-white shadow-soft rounded-xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-text-placeholder mb-4" />
            <p className="text-[13px] leading-[18px] text-text-secondary">No events found.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event, index) => {
            const status = getStatusInfo(event);
            return (
              <motion.div {...fadeSlideUp(index)} key={event.id}>
              <Link href={`/officer/reports/${event.id}`} prefetch={true}
                onMouseEnter={() => {
                  prefetchFsDetail(event.id).then(data =>
                    setFsDetailCache(event.id, data)
                  ).catch(() => {});
                }}>
                <Card className="h-full bg-surface-white shadow-soft rounded-xl transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{event.name}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {event.officer?.first_name} {event.officer?.last_name}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-[13px] leading-[18px]">
                      <Calendar className="h-4 w-4 text-text-secondary" />
                      <span className="text-text-body">
                        {new Date(event.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] leading-[18px]">
                      <FileText className="h-4 w-4 text-text-secondary" />
                      <span className="text-text-body">
                        {event.formCount > 0
                          ? `${event.pendingFormCount} pending / ${event.formCount} total no-receipt forms`
                          : 'No no-receipt forms'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
