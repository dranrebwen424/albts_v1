'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Event detail error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full bg-surface-white shadow-soft rounded-xl">
        <CardContent className="p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-[20px] font-[650] tracking-[-0.02em] text-text-primary">
            Something went wrong
          </h2>
          <p className="text-[13px] leading-[18px] text-text-secondary">
            Failed to load event details. This might be a temporary issue.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl"
            >
              Go Back
            </Button>
            <Button
              onClick={reset}
              className="bg-primary text-white hover:bg-primary-hover rounded-xl"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
