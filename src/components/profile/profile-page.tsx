'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyProfile } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Shield, Calendar, Building2, KeyRound, LogOut } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/client';

export function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`;

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em] text-text-primary">
        My Profile
      </h1>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 rounded-full bg-primary-tint-bg flex items-center justify-center text-[17px] leading-6 font-[590] text-primary flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] leading-6 font-[590] tracking-[-0.02em] text-text-primary">
                {profile.first_name} {profile.middle_name ? profile.middle_name + ' ' : ''}{profile.last_name}
              </h2>
              <p className="text-[13px] leading-[18px] text-text-secondary mt-0.5">{profile.email}</p>
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

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-gray flex items-center justify-center">
              <Building2 className="h-4 w-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-[11px] leading-[14px] text-text-secondary">Department</p>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary">{profile.departments?.name || (profile.department_id ? 'Assigned' : 'Not assigned')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-gray flex items-center justify-center">
              <Shield className="h-4 w-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-[11px] leading-[14px] text-text-secondary">Role</p>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary capitalize">{profile.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-gray flex items-center justify-center">
              <Calendar className="h-4 w-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-[11px] leading-[14px] text-text-secondary">Member Since</p>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary">{profile.created_at ? formatDate(profile.created_at) : 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface-gray flex items-center justify-center">
              <User className="h-4 w-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-[11px] leading-[14px] text-text-secondary">Status</p>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary capitalize">{profile.status || 'Active'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/change-password" prefetch={true}>
            <Button variant="outline">
              <KeyRound className="h-4 w-4 mr-2" /> Change Password
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Sign Out — visible on mobile where the top header logout is removed */}
      <Card className="shadow-sm border-red-100 lg:hidden">
        <CardContent className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-error hover:bg-red-50 hover:text-error"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="h-4 w-4" />
            <span>{signingOut ? 'Signing out…' : 'Sign Out'}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
