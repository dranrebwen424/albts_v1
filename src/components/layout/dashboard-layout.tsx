'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useSidebarStore } from '@/stores/sidebar';
import { useAuthStore } from '@/stores/auth';
import { createClient } from '@/lib/supabase/client';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { PageTransition } from '@/components/shared/page-transition';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { collapsed, setIsMobile, isMobile } = useSidebarStore();
  const { setProfile } = useAuthStore();
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleResize = useCallback(() => {
    clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => setIsMobile(window.innerWidth < 1024), 150);
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
    };

    initAuth();
  }, [router, setProfile]);

  return (
    <div className="flex min-h-screen bg-bg-app">
      <Sidebar />
      {isMobile && <MobileNav />}
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-500 ease-out',
          isMobile ? 'ml-0 pt-14 pb-20' : collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#1D1D1F',
            border: 'none',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)',
            borderRadius: '12px',
            fontSize: '13px',
            padding: '12px 16px',
          },
        }}
      />
    </div>
  );
}
