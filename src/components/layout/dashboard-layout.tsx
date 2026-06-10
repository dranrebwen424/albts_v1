'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useSidebarStore } from '@/stores/sidebar';
import { useAuthStore } from '@/stores/auth';
import { createClient } from '@/lib/supabase/client';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils/cn';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { collapsed, setIsMobile, isMobile } = useSidebarStore();
  const { setProfile, profile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  const handleResize = useCallback(() => {
    setIsMobile(window.innerWidth < 1024);
  }, [setIsMobile]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (profile) {
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
      {isMobile && <MobileNav />}
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-300',
          isMobile ? 'ml-0 pt-14 pb-16' : collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
