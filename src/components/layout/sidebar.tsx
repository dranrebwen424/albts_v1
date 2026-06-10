'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { useSidebarStore } from '@/stores/sidebar';
import { useAuthStore } from '@/stores/auth';
import {
  CalendarRange,
  ClipboardList,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import { getPendingForms, getNotifications, markAllNotificationsRead } from '@/lib/actions';
import { formatDateTime } from '@/lib/utils/format';
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
  { label: 'Financial Reports', href: '/officer/reports', icon: <FileText className="h-4 w-4" />, roles: ['officer'] },
  { label: 'Events', href: '/adviser/events', icon: <CalendarRange className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Pending Approvals', href: '/adviser/pending', icon: <ClipboardList className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Financial Reports', href: '/adviser/reports', icon: <FileText className="h-4 w-4" />, roles: ['adviser'] },
  { label: 'Departments', href: '/admin/departments', icon: <Building2 className="h-4 w-4" />, roles: ['admin'] },
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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (profile?.role === 'adviser' && profile?.department_id) {
      getPendingForms(profile.department_id).then((forms) => {
        setPendingCount(forms.filter((f: any) => f.status === 'pending').length);
      }).catch(() => {});
    }
  }, [profile]);

  const userId = profile?.user_id;

  useEffect(() => {
    if (profile?.role === 'adviser' && userId) {
      getNotifications(userId).then(setNotifications).catch(() => {});
      const interval = setInterval(() => {
        getNotifications(userId).then(setNotifications).catch(() => {});
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [profile, userId]);

  useEffect(() => {
    if (!showNotifs || !userId) return;
    markAllNotificationsRead(userId).catch(() => {});
  }, [showNotifs, userId]);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifs]);

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
              </Link>
            );
          })}
        </nav>

        {profile?.role === 'adviser' && (
          <div ref={notifRef} className="relative mt-2 px-2">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full relative',
                'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800',
                collapsed && 'justify-center px-2'
              )}
            >
              <Bell className="h-4 w-4" />
              {!collapsed && <span>Notifications</span>}
              {notifications.filter(n => !n.read).length > 0 && (
                <span className={cn(
                  'flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white',
                  collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'
                )}>
                  {notifications.filter(n => !n.read).length > 9 ? '9+' : notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className={cn(
                'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg z-50 overflow-hidden',
                collapsed ? 'absolute left-full ml-2 top-0 w-72' : 'w-full mt-1'
              )}>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500">No notifications</div>
                  ) : (
                    notifications.map((n) => {
                      const extractedEventId = n.type?.startsWith('budget_') ? n.type.split('_').pop() : null;
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (extractedEventId) {
                              router.push(`/adviser/events/${extractedEventId}`);
                              setShowNotifs(false);
                            }
                          }}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-xs border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors',
                            n.read ? 'opacity-60' : 'bg-neutral-50 dark:bg-neutral-800/50',
                            extractedEventId ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700' : 'cursor-default'
                          )}
                        >
                          <div className="font-medium text-neutral-900 dark:text-white">{n.title}</div>
                          <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{formatDateTime(n.created_at)}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
            <div className="border-t border-neutral-200 dark:border-neutral-800 p-3">
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
