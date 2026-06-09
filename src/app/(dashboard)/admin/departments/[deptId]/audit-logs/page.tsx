'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/format';
import { ScrollText, Shield, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuditLogsPage() {
  const params = useParams();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_admin_id_fkey(first_name, last_name)')
        .eq('department_id', params.deptId)
        .order('created_at', { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    init();
  }, [params.deptId, router]);

  if (loading) return <div className="py-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <div className="py-4 space-y-3">
      {logs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-sm text-neutral-500 flex flex-col items-center gap-2">
            <ScrollText className="h-8 w-8 text-neutral-300" />
            No audit logs yet
          </CardContent>
        </Card>
      ) : logs.map(log => {
        const eventName = log.details?.event_name;
        const otherDetails = { ...log.details };
        delete otherDetails.event_name;
        delete otherDetails.event_id;
        return (
          <Card key={log.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <p className="text-sm font-medium">{log.action}</p>
                  </div>
                  {eventName && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Event: {eventName}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span>{log.profiles?.first_name} {log.profiles?.last_name}</span>
                  </div>
                  {Object.keys(otherDetails).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {Object.entries(otherDetails).map(([key, value]: [string, any]) => (
                        <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0">
                          {key.replace(/_/g, ' ')}: {typeof value === 'string' ? value.length > 20 ? value.slice(0, 20) + '…' : value : JSON.stringify(value)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-neutral-400 whitespace-nowrap flex-shrink-0">{formatDateTime(log.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
