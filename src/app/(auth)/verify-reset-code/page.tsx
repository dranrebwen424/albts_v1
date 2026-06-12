'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyResetCode } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

function VerifyCodeForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const router = useRouter();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!email) {
      router.push('/forgot-password');
    }
  }, [email, router]);

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyResetCode(email, code);
      router.push(`/set-password?token=${encodeURIComponent(result.token)}`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid code');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6 animate-fade-in">
      <div className="text-center space-y-1">
        <h1 className="text-[28px] font-[700] leading-[34px] tracking-[-0.05em] text-text-primary">
          ALBTS
        </h1>
        <p className="text-[13px] leading-[18px] text-text-secondary">
          Reset your password
        </p>
      </div>
      <Card className="shadow-sm">
        <CardHeader className="text-center">
          <CardTitle>Enter Reset Code</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to {email ? `${email.slice(0, 3)}...${email.slice(email.indexOf('@'))}` : 'your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="h-12 w-11 rounded-lg border border-divider bg-surface-white text-center text-[17px] font-[590] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 disabled:opacity-50 transition-all duration-200"
                  required
                />
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={loading || digits.join('').length !== 6}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</> : 'Verify Code'}
            </Button>
            <div className="text-center">
              <Link href="/forgot-password" prefetch={true} className="text-[11px] leading-[14px] text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" /> Try a different email
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyResetCodePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4">
      <Suspense fallback={
        <div className="w-full max-w-sm animate-fade-in">
          <Card className="shadow-sm">
            <CardContent className="py-8 text-center text-[13px] text-text-secondary">Loading...</CardContent>
          </Card>
        </div>
      }>
        <VerifyCodeForm />
      </Suspense>
    </div>
  );
}
