'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useNotifStore } from '@/stores/notifications';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/actions';
import { formatDateTime } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Bell, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Notification } from '@/types';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(dateStr);
}

function getNotifLink(n: Notification, role: string): string | null {
  if (!n.event_id) return null;
  if (role === 'adviser') {
    if (n.type === 'fs_ready') return `/adviser/reports/${n.event_id}`;
    return `/adviser/events/${n.event_id}`;
  }
  if (role === 'officer') {
    if (n.type === 'fs_approved') return `/officer/reports/${n.event_id}`;
    return `/officer/events/${n.event_id}`;
  }
  return null;
}

export function NotificationsPage({ role }: { role: 'officer' | 'adviser' }) {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotifStore();

  // Background refresh on mount
  useEffect(() => {
    if (!profile?.user_id) return;
    getNotifications(profile.user_id).then(setNotifications).catch(() => {});
  }, [profile?.user_id, setNotifications]);

  const handleClick = useCallback(
    async (n: Notification) => {
      if (!n.read) {
        markRead(n.id);
        markNotificationRead(n.id).catch(() => {});
      }
      const link = getNotifLink(n, role);
      if (link) router.push(link);
    },
    [markRead, router, role]
  );

  const handleMarkAllRead = useCallback(() => {
    if (!profile?.user_id) return;
    markAllRead();
    markAllNotificationsRead(profile.user_id).catch(() => {});
  }, [markAllRead, profile?.user_id]);

  const unreadList = notifications.filter((n) => !n.read);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-neutral-500" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-8">
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
          <Bell className="h-10 w-10 mb-3" />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const link = getNotifLink(n, role);
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3.5 rounded-xl transition-colors border',
                  n.read
                    ? 'border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  link ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-1.5 h-2 w-2 rounded-full shrink-0',
                      n.read ? 'bg-neutral-300 dark:bg-neutral-600' : 'bg-blue-500'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'text-sm truncate',
                          n.read ? 'text-neutral-600 dark:text-neutral-400' : 'font-semibold text-neutral-900 dark:text-white'
                        )}
                      >
                        {n.title}
                      </p>
                      {link && (
                        <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                      )}
                    </div>
                    {n.events?.name && (
                      <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                        {n.events.name}
                      </p>
                    )}
                    <p
                      className={cn(
                        'text-xs mt-0.5 line-clamp-2',
                        n.read ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'
                      )}
                    >
                      {n.message}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1.5">
                      {getRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
