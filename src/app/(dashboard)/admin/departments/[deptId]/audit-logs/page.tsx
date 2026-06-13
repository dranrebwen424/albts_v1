'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/format';
import { Scroll, Shield, User} from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function AuditLogsPage() {
  const params = useParams();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_admin_id_fkey(first_name, last_name)')
        .eq('department_id', params.deptId)
        .order('created_at', { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    init();
  }, [params.deptId]);

  if (loading) return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <motion.div variants={staggerContainer()} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="py-4 space-y-3">
      {logs.length === 0 ? (
        <Card className="bg-surface-white rounded-xl shadow-sm">
          <CardContent className="text-center py-8 text-[13px] leading-[18px] text-text-secondary flex flex-col items-center gap-2">
            <Scroll className="h-8 w-8 text-text-placeholder" />
            No audit logs yet
          </CardContent>
        </Card>
      ) : logs.map((log, index) => {
        const eventName = log.details?.event_name;
        const otherDetails = { ...log.details };
        delete otherDetails.event_name;
        delete otherDetails.event_id;
        return (
          <motion.div {...fadeSlideUp(index)} key={log.id}>
            <Card className="bg-surface-white rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-text-placeholder flex-shrink-0" />
                      <p className="text-[15px] leading-[22px] font-medium">{log.action}</p>
                    </div>
                    {eventName && (
                      <div className="text-[11px] leading-[14px] text-primary-tint-text font-medium">
                        Event: {eventName}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[11px] leading-[14px] text-text-secondary">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span>{log.profiles?.first_name} {log.profiles?.last_name}</span>
                    </div>
                    {Object.keys(otherDetails).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {Object.entries(otherDetails).map(([key, value]: [string, any]) => (
                          <Badge key={key} variant="outline" className="text-[11px] leading-[14px] px-1.5 py-0">
                            {key.replace(/_/g, ' ')}: {typeof value === 'string' ? value.length > 20 ? value.slice(0, 20) + '…' : value : JSON.stringify(value)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] leading-[14px] text-text-placeholder whitespace-nowrap flex-shrink-0">{formatDateTime(log.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
