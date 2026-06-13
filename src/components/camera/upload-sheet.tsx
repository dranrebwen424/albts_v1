'use client';

import { useEffect, useRef } from 'react';
import { Camera, Image} from '@phosphor-icons/react';

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/[0.12] animate-fade-in">
      <div
        ref={sheetRef}
        className="w-full max-w-lg bg-surface-white rounded-t-3xl shadow-lg animate-slide-up"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-divider" />
        </div>

        <div className="px-6 pb-8 pt-2 space-y-2">
          <h3 className="text-[17px] leading-6 font-[590] tracking-[-0.02em] text-text-primary text-center mb-4">
            Upload Receipt
          </h3>

          <button
            onClick={() => { onTakePhoto(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-divider hover:bg-surface-gray transition-all duration-300 ease-out text-left hover:shadow-sm"
          >
            <div className="h-10 w-10 rounded-full bg-surface-gray flex items-center justify-center">
              <Camera className="h-5 w-5 text-text-body" />
            </div>
            <div>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary">Take Photo</p>
              <p className="text-[13px] leading-[18px] text-text-secondary">Use your camera to capture the receipt</p>
            </div>
          </button>

          <button
            onClick={() => { onBrowseFiles(); onClose(); }}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-divider hover:bg-surface-gray transition-all duration-300 ease-out text-left hover:shadow-sm"
          >
            <div className="h-10 w-10 rounded-full bg-surface-gray flex items-center justify-center">
              <Image className="h-5 w-5 text-text-body" />
            </div>
            <div>
              <p className="text-[15px] leading-[22px] font-medium text-text-primary">Browse Files</p>
              <p className="text-[13px] leading-[18px] text-text-secondary">Select from your device storage</p>
            </div>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 text-[15px] leading-[22px] text-text-secondary hover:text-text-primary transition-colors text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
