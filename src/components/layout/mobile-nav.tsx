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
  UserCircle,
  Menu,
  LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Events', href: '/officer/events', icon: CalendarRange, roles: ['officer'] },
  { label: 'Reports', href: '/officer/reports', icon: FileText, roles: ['officer'] },
  { label: 'Profile', href: '/officer/profile', icon: UserCircle, roles: ['officer'] },
  { label: 'Events', href: '/adviser/events', icon: CalendarRange, roles: ['adviser'] },
  { label: 'Pending', href: '/adviser/pending', icon: ClipboardList, roles: ['adviser'] },
  { label: 'Reports', href: '/adviser/reports', icon: FileText, roles: ['adviser'] },
  { label: 'Profile', href: '/adviser/profile', icon: UserCircle, roles: ['adviser'] },
  { label: 'Departments', href: '/admin/departments', icon: Building2, roles: ['admin'] },
  { label: 'Profile', href: '/admin/profile', icon: UserCircle, roles: ['admin'] },
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
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-divider frosted px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 text-[15px] font-[590] tracking-[-0.02em] text-text-primary"
        >
          <Menu className="h-5 w-5" />
          <span>ALBTS</span>
        </button>
        <button onClick={handleSignOut} className="text-text-secondary hover:text-text-primary transition-colors">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-divider frosted pb-safe lg:hidden">
        {userNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 text-[10px] font-[500] transition-colors duration-200 relative min-w-[60px]',
                isActive
                  ? 'text-primary'
                  : 'text-text-placeholder hover:text-text-secondary'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
