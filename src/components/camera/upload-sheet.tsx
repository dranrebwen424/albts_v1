'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { Camera, Image} from '@phosphor-icons/react';

interface UploadSheetProps {
  open: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onBrowseFiles: () => void;
}

const springSheet = { stiffness: 600, damping: 50, mass: 0.9 };

export function UploadSheet({ open, onClose, onTakePhoto, onBrowseFiles }: UploadSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            className="absolute inset-0 bg-black/[0.12]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '40%', opacity: 0.8 }}
            transition={{ ...springSheet, exit: { duration: 0.15, ease: [0.33, 1, 0.68, 1] } }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={0.15}
            onDragEnd={(_: any, info: PanInfo) => {
              if (info.offset.y > 80) onClose();
            }}
            className="relative w-full max-w-lg bg-surface-white rounded-t-3xl shadow-xl"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
