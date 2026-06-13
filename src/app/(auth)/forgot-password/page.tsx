'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sendResetCode } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await sendResetCode(email);
      if (result.sent) {
        setSent(true);
        router.push(`/verify-reset-code?email=${encodeURIComponent(email)}`);
      } else {
        toast.success('If an account exists with that email, a reset code has been sent.');
        setSent(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-tint-bg border border-primary-tint-border">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-[28px] font-[700] leading-[34px] tracking-[-0.05em] text-text-primary">
            ALBTS
          </h1>
          <p className="text-[13px] leading-[18px] text-text-secondary">
            Reset your password
          </p>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardContent className="p-7">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-text-body">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="gmail@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full h-11 text-[15px] font-[590]" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Reset Code'}
            </Button>
            <div className="text-center">
              <Link href="/login" prefetch={true} className="text-[11px] leading-[14px] text-text-secondary hover:text-text-primary transition-colors duration-150 inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
