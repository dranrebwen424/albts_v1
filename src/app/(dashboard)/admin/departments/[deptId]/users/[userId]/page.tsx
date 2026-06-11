'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfileById, adminResetUserPassword, updateUserStatus } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, User, Shield, Calendar, Building2, Loader2, KeyRound, Ban, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/format';

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
    <div className="py-4 space-y-6 max-w-2xl">
      <Link
        href={`/admin/departments/${params.deptId}/users`}
        prefetch={true}
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="h-16 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xl font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">
                {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
              </h2>
              <p className="text-sm text-neutral-500">{profile.email}</p>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Department</p>
              <p className="font-medium">{profile.departments?.name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Shield className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Role</p>
              <p className="font-medium capitalize">{profile.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Member Since</p>
              <p className="font-medium">{profile.created_at ? formatDate(profile.created_at) : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs text-neutral-500">Password Changed</p>
              <p className="font-medium">{profile.password_changed ? 'Yes' : 'No (default password)'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleResetPassword}
            disabled={resetting}
          >
            {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Reset Password & Copy Invitation Link
          </Button>
          <Button
            variant={isDeactivated ? 'default' : 'destructive'}
            className="w-full justify-start"
            onClick={handleToggleStatus}
            disabled={togglingStatus}
          >
            {togglingStatus ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isDeactivated ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}
            {isDeactivated ? 'Reactivate Account' : 'Deactivate Account'}
          </Button>
        </CardContent>
      </Card>

      {profile.recentActivity && profile.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 text-sm border-b border-neutral-100 dark:border-neutral-800 pb-3 last:border-0">
                <Clock className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">{formatDate(log.created_at)}</p>
                  <p className="text-sm">{log.action}</p>
                  {log.admin && (
                    <p className="text-xs text-neutral-400">
                      by {log.admin.first_name} {log.admin.last_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
