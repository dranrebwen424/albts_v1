'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/auth';
import { useNotifStore } from '@/stores/notifications';
import {
  CalendarRange,
  FileText,
  ClipboardList,
  Building2,
  UserCircle,
  Bell,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Events',        href: '/officer/events',        icon: CalendarRange,  roles: ['officer'] },
  { label: 'Notifications', href: '/officer/notifications',  icon: Bell,           roles: ['officer'] },
  { label: 'Reports',       href: '/officer/reports',        icon: FileText,       roles: ['officer'] },
  { label: 'Profile',       href: '/officer/profile',        icon: UserCircle,     roles: ['officer'] },
  { label: 'Events',        href: '/adviser/events',         icon: CalendarRange,  roles: ['adviser'] },
  { label: 'Pending',       href: '/adviser/pending',        icon: ClipboardList,  roles: ['adviser'] },
  { label: 'Notifications', href: '/adviser/notifications',  icon: Bell,           roles: ['adviser'] },
  { label: 'Reports',       href: '/adviser/reports',        icon: FileText,       roles: ['adviser'] },
  { label: 'Profile',       href: '/adviser/profile',        icon: UserCircle,     roles: ['adviser'] },
  { label: 'Departments',   href: '/admin/departments',      icon: Building2,      roles: ['admin'] },
  { label: 'Profile',       href: '/admin/profile',          icon: UserCircle,     roles: ['admin'] },
];

// Sub-pages where the nav bar should be hidden
const SUB_PAGE_PATTERNS = [
  /\/(officer|adviser)\/events\/[^/]+/,
  /\/(officer|adviser)\/reports\/[^/]+/,
  /\/admin\/departments\/[^/]+/,
];

function isSubPage(pathname: string) {
  return SUB_PAGE_PATTERNS.some((r) => r.test(pathname));
}

export function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { unreadCount } = useNotifStore();

  const items = NAV_ITEMS.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const hidden = isSubPage(pathname);

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.nav
          key="mobile-nav"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="fixed bottom-0 left-0 right-0 z-30 lg:hidden"
        >
          {/* frosted glass pill bar — light editorial warmth */}
          <div className="mx-3 mb-3 rounded-2xl frosted-strong border border-white/[0.6] shadow-[0_8px_32px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-around px-1 py-2">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                const isNotif = item.label === 'Notifications';
                const hasBadge = isNotif && unreadCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-200 min-w-[52px]',
                      isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-body'
                    )}
                  >
                    {/* Active pill background */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-pill"
                        className="absolute inset-0 rounded-xl bg-primary-tint-bg"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}

                    {/* Icon + badge wrapper */}
                    <div className="relative z-10">
                      <Icon className={cn('h-[22px] w-[22px]', isActive && 'text-primary')} strokeWidth={isActive ? 2.2 : 1.8} />
                      {hasBadge && (
                        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white px-0.5">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>

                    <span className={cn('text-[9px] font-semibold tracking-wide z-10', isActive ? 'text-primary' : 'text-text-secondary')}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
