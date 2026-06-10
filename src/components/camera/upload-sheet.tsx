'use client';

import { useEffect, useRef } from 'react';
import { Camera, Image } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface UploadSheetProps {
  open: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onBrowseFiles: () => void;
}

export function UploadSheet({ open, onClose, onTakePhoto, onBrowseFiles }: UploadSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-in fade-in">
      <div
        ref={sheetRef}
        className={cn(
          'w-full max-w-lg bg-white dark:bg-neutral-950 rounded-t-2xl shadow-2xl',
          'animate-in slide-in-from-bottom duration-300'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        <div className="px-6 pb-8 pt-2 space-y-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white text-center mb-4">
            Upload Receipt
          </h3>

          <button
            onClick={() => { onTakePhoto(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Camera className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Take Photo</p>
              <p className="text-xs text-neutral-500">Use your camera to capture the receipt</p>
            </div>
          </button>

          <button
            onClick={() => { onBrowseFiles(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">Browse Files</p>
              <p className="text-xs text-neutral-500">Select from your device storage</p>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
