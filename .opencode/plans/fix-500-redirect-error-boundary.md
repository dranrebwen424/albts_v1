# Fix: Page redirects back on intermittent 500 errors during navigation

## Root Cause

When navigating to an event detail page (e.g., `/officer/events/123`), an intermittent 500 error during the RSC payload fetch causes Next.js to revert the navigation — this looks like "going back to the events list."

There is **no error boundary** (`error.tsx`) in any of the event detail routes. Without one, a rendering error surfaces as a 500 response, and the client router aborts the navigation and falls back to the previous page.

## Files to Create

### 1. `src/app/(dashboard)/officer/events/[eventId]/error.tsx`

```tsx
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
```

### 2. `src/app/(dashboard)/adviser/events/[eventId]/error.tsx`

Same content as above (copy the file).

### 3. `src/app/(dashboard)/admin/departments/[deptId]/events/[eventId]/error.tsx`

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminEventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    console.error('Admin event detail error:', error);
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
            Failed to load event details.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/departments/${params.deptId}/events`)}
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
```

### 4. `src/app/(dashboard)/officer/events/[eventId]/page.tsx` — wrap in try-catch

Currently:
```tsx
export default async function OfficerEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const [event, receipts, forms] = await Promise.all([
    getEvent(eventId).catch(() => null),
    getReceipts(eventId).catch(() => [] as any[]),
    getNoReceiptForms(eventId).catch(() => [] as any[]),
  ]);

  if (!event) return <div ...>Event not found</div>;

  return <EventDetailClient ... />;
}
```

Change to:
```tsx
export default async function OfficerEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  try {
    const [event, receipts, forms] = await Promise.all([
      getEvent(eventId).catch(() => null),
      getReceipts(eventId).catch(() => [] as any[]),
      getNoReceiptForms(eventId).catch(() => [] as any[]),
    ]);

    if (!event) return <div ...>Event not found</div>;

    return <EventDetailClient ... />;
  } catch {
    return <div className="py-8 text-[13px] leading-[18px] text-text-secondary">Failed to load event details. Please try again.</div>;
  }
}
```

### 5. Same try-catch wrap for adviser and admin event detail pages

- `src/app/(dashboard)/adviser/events/[eventId]/page.tsx`
- `src/app/(dashboard)/admin/departments/[deptId]/events/[eventId]/page.tsx`

## Verification

1. Navigate to an event detail page — should load normally
2. No 500 errors should appear in Network tab during successful navigation
3. If a transient error occurs, the error boundary should show the "Try Again" card instead of reverting to the events list
4. Clicking "Try Again" should re-render the page
5. Run `npx tsc --noEmit` to verify no type errors
