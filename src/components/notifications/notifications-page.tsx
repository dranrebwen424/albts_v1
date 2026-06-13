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
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

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
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-text-secondary" />
          <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em] text-text-primary">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold bg-error text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-8">
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <Bell className="h-12 w-12 text-text-placeholder mb-4" />
          <p className="text-[15px] leading-[22px] text-text-secondary">No notifications yet</p>
        </div>
      ) : (
        <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="space-y-3">
          {notifications.map((n, index) => {
            const link = getNotifLink(n, role);
            return (
              <motion.div {...fadeSlideUp(index)} key={n.id}>
              <button
                onClick={() => handleClick(n)}
                className={cn(
                  'w-full text-left p-4 rounded-xl transition-all duration-300 ease-out',
                  n.read
                    ? 'bg-surface-white shadow-soft hover:shadow-md'
                    : 'bg-primary-tint-bg shadow-soft hover:shadow-md',
                  link ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-1.5 h-2 w-2 rounded-full shrink-0',
                      n.read ? 'bg-divider' : 'bg-primary'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          'text-[15px] leading-[22px] truncate',
                          n.read ? 'text-text-body' : 'font-[590] text-text-primary'
                        )}
                      >
                        {n.title}
                      </p>
                      {link && (
                        <ExternalLink className="h-3 w-3 shrink-0 text-text-secondary" />
                      )}
                    </div>
                    {n.events?.name && (
                      <p className="text-[13px] leading-[18px] text-text-secondary mt-0.5 font-medium">
                        {n.events.name}
                      </p>
                    )}
                    <p
                      className={cn(
                        'text-[13px] leading-[18px] mt-0.5 line-clamp-2',
                        n.read ? 'text-text-placeholder' : 'text-text-secondary'
                      )}
                    >
                      {n.message}
                    </p>
                    <p className="text-[11px] leading-[14px] text-text-placeholder mt-1.5">
                      {getRelativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
