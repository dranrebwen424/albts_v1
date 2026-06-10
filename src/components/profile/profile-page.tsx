'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Calendar, Building2, KeyRound } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';

export function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>

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
                <Badge variant="secondary" className="capitalize">{profile.role}</Badge>
                {profile.status === 'deactivated' && (
                  <Badge variant="destructive">Deactivated</Badge>
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
              <p className="font-medium">{profile.departments?.name || (profile.department_id ? 'Assigned' : 'Not assigned')}</p>
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
              <p className="text-xs text-neutral-500">Status</p>
              <p className="font-medium capitalize">{profile.status || 'Active'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Security</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push('/change-password')}>
            <KeyRound className="h-4 w-4 mr-2" /> Change Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
