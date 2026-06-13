'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, EyeSlash, Leaf} from '@phosphor-icons/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        const res = await fetch('/api/auth/get-role');
        const profile = await res.json();

        if (!res.ok) {
          setError(profile.error || 'Account not set up. Contact your admin.');
          setLoading(false);
          return;
        }

        if (!profile.password_changed) {
          router.push('/change-password');
          return;
        }

        switch (profile.role) {
          case 'officer':
            router.push('/officer/events');
            break;
          case 'adviser':
            router.push('/adviser/events');
            break;
          case 'admin':
            router.push('/admin/departments');
            break;
          default:
            setError('Unknown role. Contact your admin.');
            setLoading(false);
        }
      } catch {
        setError('Network error. Try again.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-tint-bg border border-primary-tint-border">
          <Leaf className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[28px] font-[700] leading-[34px] tracking-[-0.05em] text-text-primary">
            ALBTS
          </h1>
          <p className="text-[13px] leading-[18px] text-text-secondary">
            Departmental Liquidation &amp; Financial Reporting
          </p>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-7">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-text-body">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="gmail@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-text-body">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors duration-150"
                >
                  {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-0.5">
                <Link href="/forgot-password" prefetch={true} className="text-[11px] leading-[14px] text-text-secondary hover:text-text-primary transition-colors duration-150">
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && (
              <p className="text-[11px] leading-[14px] text-error">{error}</p>
            )}
            <Button type="submit" className="w-full h-11 text-[15px] font-[590]" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
