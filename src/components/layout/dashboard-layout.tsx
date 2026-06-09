'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarStore } from '@/stores/sidebar';
import { useAuthStore } from '@/stores/auth';
import { createClient } from '@/lib/supabase/client';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils/cn';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { collapsed } = useSidebarStore();
  const { setProfile, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch('/api/auth/get-role');
        const profile = await res.json();
        if (res.ok) {
          setProfile(profile as any);
        }
      } catch {}
      setLoading(false);
    };

    initAuth();
  }, [router, setProfile]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
