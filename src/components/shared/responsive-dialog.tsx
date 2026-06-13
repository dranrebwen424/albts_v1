'use client';

import { type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useIsMobile } from '@/lib/utils/use-is-mobile';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet open={open} onClose={() => onOpenChange(false)}>
        <div className="space-y-4 pt-2">
          <div className="text-center">
            <h2 className="text-[17px] leading-6 font-[590] tracking-[-0.02em] text-text-primary">
              {title}
            </h2>
            {description && (
              <p className="text-[13px] leading-[18px] text-text-secondary mt-1">
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      </BottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? '' : 'sr-only'}>
            {description || `${title} dialog`}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
