'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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
  { label: 'Events', href: '/officer/events', icon: <CalendarRange className="h-4 w-4" />, roles: ['officer'] },
  { label: 'Notifications', href: '/officer/notifications', icon: <Bell className="h-4 w-4" />, roles: ['officer'] },
  { label: 'Financial Reports', href: '/officer/reports', icon: <FileText className="h-4 w-4" />, roles: ['officer'] },
  { label: 'Events', href: '/adviser/events', icon: <CalendarRange className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Pending Approvals', href: '/adviser/pending', icon: <ClipboardList className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Notifications', href: '/adviser/notifications', icon: <Bell className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Financial Reports', href: '/adviser/reports', icon: <FileText className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Departments', href: '/admin/departments', icon: <Building2 className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Profile', href: '/officer/profile', icon: <UserCircle className="h-4 w-4" />, roles: ['officer'] },
  { label: 'Profile', href: '/adviser/profile', icon: <UserCircle className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Profile', href: '/admin/profile', icon: <UserCircle className="h-4 w-4" />, roles: ['admin'] },
];

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

  // Background notification polling for both roles — populates Zustand store
  const { setNotifications, unreadCount } = useNotifStore();

  useEffect(() => {
    if (!profile?.user_id) return;
    const fetch = () => getNotifications(profile.user_id).then(setNotifications).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [profile?.user_id, setNotifications]);

  // Background events prefetch — populates shared store for instant list pages
  const { setEvents } = useEventsStore();

  useEffect(() => {
    if (!profile?.department_id) return;
    const fetch = () => getEventsWithFsStatus(profile.department_id).then(setEvents).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [profile?.department_id, setEvents]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn('flex h-14 items-center border-b border-neutral-200 dark:border-neutral-800 px-4', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            ALBTS
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={toggle} className="h-7 w-7">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {userNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const isPending = item.label === 'Pending Approvals';
            const isNotif = item.label === 'Notifications';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  collapsed && 'justify-center px-2'
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
                {isPending && pendingCount > 0 && (
                  <span className={cn(
                    'flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white',
                    collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                  )}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
                {isNotif && unreadCount > 0 && (
                  <span className={cn(
                    'flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white',
                    collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                  )}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-2">
        {!collapsed && profile && (
          <div className="px-2 pb-2">
            <div className="text-xs font-medium text-neutral-900 dark:text-white truncate">
              {profile.first_name} {profile.last_name}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {profile.role}
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size={collapsed ? 'icon' : 'default'}
          className={cn(
            'w-full justify-start gap-3 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50',
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
      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b border-neutral-200 dark:border-neutral-800 px-4">
              <span className="text-sm font-semibold tracking-tight">ALBTS</span>
            </div>
            <ScrollArea className="flex-1 px-2 py-4 min-h-0">
              <nav className="flex flex-col gap-1">
                {userNavItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const isPending = item.label === 'Pending Approvals';
                  const isNotif = item.label === 'Notifications';
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
                        isActive
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {isPending && pendingCount > 0 && (
                        <span className="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                      {isNotif && unreadCount > 0 && (
                        <span className="ml-auto flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  );
                })}

              </nav>
            </ScrollArea>
            <div className="border-t border-neutral-200 dark:border-neutral-800 p-3 pb-14">
              {profile && (
                <div className="px-1 pb-3">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {profile.first_name} {profile.last_name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                    {profile.role}
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 hidden lg:flex h-screen flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
