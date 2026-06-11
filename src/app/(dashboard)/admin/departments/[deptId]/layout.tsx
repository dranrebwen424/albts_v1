'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getDepartments } from '@/lib/actions';
import { ArrowLeft } from 'lucide-react';
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
  const router = useRouter();
  const [deptName, setDeptName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const depts = await getDepartments();
      const dept = depts.find((d: any) => d.id === params.deptId);
      if (dept) setDeptName(dept.name);
      setLoading(false);
    };
    init();
  }, [params.deptId, router]);

  const currentTab = pathname.split('/').pop();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/departments" prefetch={true} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-8 w-48" /> : deptName}
          </h1>
        </div>
      </div>

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-0">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={`/admin/departments/${params.deptId}/${tab.path}`}
            prefetch={true}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              currentTab === tab.path
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
