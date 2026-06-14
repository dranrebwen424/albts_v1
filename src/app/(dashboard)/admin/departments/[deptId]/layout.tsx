'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getDepartments } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft} from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

const tabs = [
  { label: 'Events', path: 'events' },
  { label: 'Audit Logs', path: 'audit-logs' },
  { label: 'Reports', path: 'reports' },
  { label: 'Users', path: 'users' },
];

export default function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const [deptName, setDeptName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const depts = await getDepartments();
      const dept = depts.find((d: any) => d.id === params.deptId);
      if (dept) setDeptName(dept.name);
      setLoading(false);
    };
    init();
  }, [params.deptId]);

  const currentTab = pathname.split('/').pop();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/departments" prefetch={true} className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em]">
            {loading ? <Skeleton className="h-8 w-48" /> : deptName}
          </h1>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-gray p-1 rounded-lg">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={`/admin/departments/${params.deptId}/${tab.path}`}
            prefetch={true}
            className={cn(
              'px-4 py-2 text-[13px] leading-[18px] font-medium rounded-md transition-all',
              currentTab === tab.path
                ? 'bg-surface-white shadow-sm text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
