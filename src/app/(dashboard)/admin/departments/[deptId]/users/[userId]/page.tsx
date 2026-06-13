'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfileById, adminResetUserPassword, updateUserStatus } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Shield, Calendar, Building, Spinner, Key, Prohibit, CheckCircle, Clock, Warning} from '@phosphor-icons/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    getUserProfileById(params.userId as string)
      .then(setProfile)
      .catch((err) => {
        toast.error(err.message);
        router.push(`/admin/departments/${params.deptId}/users`);
      })
      .finally(() => setLoading(false));
  }, [params.userId, params.deptId, router]);

  const handleResetPassword = async () => {
    if (!window.confirm('Send password reset link to this user\'s email?')) return;
    setResetting(true);
    try {
      const { link } = await adminResetUserPassword(params.userId as string);
      await navigator.clipboard.writeText(link);
      toast.success('Reset link copied to clipboard');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleToggleStatus = async () => {
    const isActive = profile.status !== 'deactivated';
    if (!window.confirm(`${isActive ? 'Deactivate' : 'Reactivate'} this user? ${isActive ? 'They will be unable to make changes.' : ''}`)) return;
    setTogglingStatus(true);
    try {
      const newStatus = isActive ? 'deactivated' : 'active';
      await updateUserStatus(params.userId as string, newStatus);
      setProfile((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`User ${newStatus === 'deactivated' ? 'deactivated' : 'reactivated'}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4 space-y-6 max-w-2xl">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;
  const isDeactivated = profile.status === 'deactivated';

  return (
    <div className="py-4 space-y-6 max-w-2xl animate-fade-in">
      <Link
        href={`/admin/departments/${params.deptId}/users`}
        prefetch={true}
        className="inline-flex items-center gap-1 text-[13px] leading-[18px] text-text-secondary hover:text-text-primary transition-colors duration-150"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <motion.div {...staggerContainer()} viewport={{ once: true }} whileInView="animate" className="space-y-5">
        <motion.div {...fadeSlideUp(0)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className="h-16 w-16 rounded-full bg-primary-tint-bg border border-primary-tint-border flex items-center justify-center text-[17px] leading-6 font-[590] text-primary flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[17px] leading-6 font-[590] tracking-[-0.02em] text-text-primary">
                    {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
                  </h2>
                  <p className="text-[13px] leading-[18px] text-text-secondary mt-1">{profile.email}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className="capitalize">{profile.role}</Badge>
                    {isDeactivated ? (
                      <Badge variant="destructive">Deactivated</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeSlideUp(1)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardHeader>
              <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary uppercase tracking-wider">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-[13px] leading-[18px]">
                <Building className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Department</p>
                  <p className="font-medium text-text-primary">{profile.departments?.name || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px] leading-[18px]">
                <Shield className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Role</p>
                  <p className="font-medium capitalize text-text-primary">{profile.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px] leading-[18px]">
                <Calendar className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Member Since</p>
                  <p className="font-medium text-text-primary">{profile.created_at ? formatDate(profile.created_at) : 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[13px] leading-[18px]">
                <User className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Password Changed</p>
                  <p className="font-medium text-text-primary">{profile.password_changed ? 'Yes' : 'No (default password)'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeSlideUp(2)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardHeader>
              <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary uppercase tracking-wider">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start rounded-lg"
                onClick={handleResetPassword}
                disabled={resetting}
              >
                {resetting ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                Reset Password & Copy Invitation Link
              </Button>
              <Button
                variant={isDeactivated ? 'default' : 'destructive'}
                className="w-full justify-start rounded-lg"
                onClick={handleToggleStatus}
                disabled={togglingStatus}
              >
                {togglingStatus ? (
                  <Spinner className="h-4 w-4 mr-2 animate-spin" />
                ) : isDeactivated ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Prohibit className="h-4 w-4 mr-2" />
                )}
                {isDeactivated ? 'Reactivate Account' : 'Deactivate Account'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {profile.recentActivity && profile.recentActivity.length > 0 && (
          <motion.div {...fadeSlideUp(3)}>
            <Card className="bg-surface-white shadow-soft rounded-xl">
              <CardHeader>
                <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary uppercase tracking-wider">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-[13px] leading-[18px] border-b border-divider pb-3 last:border-0">
                    <Clock className="h-4 w-4 text-text-secondary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] leading-[14px] text-text-secondary">{formatDate(log.created_at)}</p>
                      <p className="text-[15px] leading-[22px] text-text-primary">{log.action}</p>
                      {log.admin && (
                        <p className="text-[11px] leading-[14px] text-text-placeholder">
                          by {log.admin.first_name} {log.admin.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
