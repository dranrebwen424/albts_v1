'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { useSidebarStore } from '@/stores/sidebar';
import { useAuthStore } from '@/stores/auth';
import { useNotifStore } from '@/stores/notifications';
import { useEventsStore } from '@/stores/events';
import {
  CalendarRange,
  ClipboardList,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { getPendingForms, getNotifications, getEventsWithFsStatus } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Events', href: '/officer/events', icon: <CalendarRange className="h-5 w-5" />, roles: ['officer'] },
  { label: 'Notifications', href: '/officer/notifications', icon: <Bell className="h-5 w-5" />, roles: ['officer'] },
  { label: 'Financial Reports', href: '/officer/reports', icon: <FileText className="h-5 w-5" />, roles: ['officer'] },
  { label: 'Events', href: '/adviser/events', icon: <CalendarRange className="h-5 w-5" />, roles: ['adviser'] },
  { label: 'Pending Approvals', href: '/adviser/pending', icon: <ClipboardList className="h-5 w-5" />, roles: ['adviser'] },
  { label: 'Notifications', href: '/adviser/notifications', icon: <Bell className="h-5 w-5" />, roles: ['adviser'] },
  { label: 'Financial Reports', href: '/adviser/reports', icon: <FileText className="h-5 w-5" />, roles: ['adviser'] },
  { label: 'Departments', href: '/admin/departments', icon: <Building2 className="h-5 w-5" />, roles: ['admin'] },
  { label: 'Profile', href: '/officer/profile', icon: <UserCircle className="h-5 w-5" />, roles: ['officer'] },
  { label: 'Profile', href: '/adviser/profile', icon: <UserCircle className="h-5 w-5" />, roles: ['adviser'] },
  { label: 'Profile', href: '/admin/profile', icon: <UserCircle className="h-5 w-5" />, roles: ['admin'] },
];

const navSpring = { stiffness: 400, damping: 35, mass: 0.8 };

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore();
  const { profile } = useAuthStore();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const userNavItems = navItems.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (profile?.role === 'adviser' && profile?.department_id) {
      getPendingForms(profile.department_id).then((forms) => {
        setPendingCount(forms.filter((f: any) => f.status === 'pending').length);
      }).catch(() => {});
    }
  }, [profile]);

  const { setNotifications, unreadCount } = useNotifStore();

  useEffect(() => {
    if (!profile?.user_id) return;
    const fetch = () => {
      if (document.visibilityState === 'visible') getNotifications(profile.user_id).then(setNotifications).catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [profile?.user_id, setNotifications]);

  const { setEvents } = useEventsStore();

  useEffect(() => {
    if (!profile?.department_id) return;
    const fetch = () => {
      if (document.visibilityState === 'visible') getEventsWithFsStatus(profile.department_id).then(setEvents).catch(() => {});
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [profile?.department_id, setEvents]);

  const sidebarContent = (
    <>
      <div className={cn('flex h-14 items-center px-5', collapsed ? 'justify-center px-0' : 'justify-between')}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
              className="text-[15px] font-[590] tracking-[-0.02em] text-text-primary"
            >
              ALBTS
            </motion.span>
          )}
        </AnimatePresence>
        <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1">
          {userNavItems.map((item, idx) => {
            const isActive = pathname.startsWith(item.href);
            const isPending = item.label === 'Pending Approvals';
            const isNotif = item.label === 'Notifications';
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...navSpring, delay: idx * 0.03 }}
              >
                <Link
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] leading-[18px] transition-all duration-200 relative',
                    isActive
                      ? 'bg-primary-tint-bg text-primary font-[590]'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-gray',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                  {isPending && pendingCount > 0 && (
                    <span className={cn(
                      'flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-error text-white',
                      collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                    )}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                  {isNotif && unreadCount > 0 && (
                    <span className={cn(
                      'flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-error text-white',
                      collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                    )}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-divider p-3">
        <AnimatePresence mode="wait">
          {!collapsed && profile && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
              className="px-2 pb-2"
            >
              <div className="text-[13px] leading-[18px] font-[590] text-text-primary truncate">
                {profile.first_name} {profile.last_name}
              </div>
              <div className="text-[11px] leading-[14px] text-text-secondary capitalize">
                {profile.role}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className={cn(
            'w-full justify-start gap-3 text-error hover:bg-red-50 hover:text-error',
            collapsed && 'justify-center'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center px-5">
              <span className="text-[15px] font-[590] tracking-[-0.02em] text-text-primary">ALBTS</span>
            </div>
            <ScrollArea className="flex-1 px-3 py-3 min-h-0">
              <nav className="flex flex-col gap-1">
                {userNavItems.map((item, idx) => {
                  const isActive = pathname.startsWith(item.href);
                  const isPending = item.label === 'Pending Approvals';
                  const isNotif = item.label === 'Notifications';
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...navSpring, delay: idx * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        prefetch={true}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] leading-[18px] transition-all duration-200 relative',
                          isActive
                            ? 'bg-primary-tint-bg text-primary font-[590]'
                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-gray'
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {isPending && pendingCount > 0 && (
                          <span className="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-error text-white">
                            {pendingCount > 99 ? '99+' : pendingCount}
                          </span>
                        )}
                        {isNotif && unreadCount > 0 && (
                          <span className="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-error text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </ScrollArea>
            <div className="border-t border-divider p-3 pb-14">
              {profile && (
                <div className="px-1 pb-3">
                  <div className="text-[13px] leading-[18px] font-[590] text-text-primary truncate">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-[11px] leading-[14px] text-text-secondary capitalize">
                    {profile.role}
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-error hover:bg-red-50 hover:text-error"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden lg:flex h-screen flex-col bg-surface-white border-r border-divider transition-all duration-500 ease-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
