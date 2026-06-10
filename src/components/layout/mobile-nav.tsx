'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/auth';
import { useSidebarStore } from '@/stores/sidebar';
import { createClient } from '@/lib/supabase/client';
import {
  CalendarRange,
  FileText,
  ClipboardList,
  Building2,
  Menu,
  LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Events', href: '/officer/events', icon: CalendarRange, roles: ['officer'] },
  { label: 'Reports', href: '/officer/reports', icon: FileText, roles: ['officer'] },
  { label: 'Events', href: '/adviser/events', icon: CalendarRange, roles: ['adviser'] },
  { label: 'Pending', href: '/adviser/pending', icon: ClipboardList, roles: ['adviser'] },
  { label: 'Reports', href: '/adviser/reports', icon: FileText, roles: ['adviser'] },
  { label: 'Departments', href: '/admin/departments', icon: Building2, roles: ['admin'] },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { setMobileOpen } = useSidebarStore();

  const userNavItems = navItems.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      {/* Top bar with hamburger */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900 dark:text-white"
        >
          <Menu className="h-5 w-5" />
          <span>ALBTS</span>
        </button>
      </header>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 pb-safe lg:hidden">
        {userNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-medium transition-colors relative',
                isActive
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-400 dark:text-neutral-500'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-neutral-900 dark:bg-white" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
