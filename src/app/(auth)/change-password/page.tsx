'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Spinner, ShieldCheck} from '@phosphor-icons/react';
import { setPasswordChanged } from '@/lib/actions';

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      await setPasswordChanged(data.user.id).catch(() => {});
    }

    toast.success('Password changed successfully');
    router.push('/login');
  };

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-tint-bg border border-primary-tint-border">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[28px] font-[700] leading-[34px] tracking-[-0.05em] text-text-primary">
            ALBTS
          </h1>
          <p className="text-[13px] leading-[18px] text-text-secondary">
            Set your password for the first time
          </p>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-7">
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-text-body">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[13px] font-medium text-text-body">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className={passwordMismatch ? 'ring-2 ring-error' : ''}
              />
              {passwordMismatch && (
                <p className="text-[11px] leading-[14px] text-error">Passwords do not match</p>
              )}
            </div>
            <Button type="submit" className="w-full h-11 text-[15px] font-[590]" disabled={loading || passwordMismatch}>
              {loading ? <><Spinner className="h-4 w-4 mr-2 animate-spin" /> Changing...</> : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
