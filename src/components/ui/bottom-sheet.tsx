'use client';

import { type ReactNode, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

const springOverlay = { stiffness: 300, damping: 35, mass: 0.9 };
const springSheet = { stiffness: 500, damping: 45, mass: 1.1 };

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
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
            className="absolute inset-0 bg-black/[0.1] backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springSheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 300 }}
            dragElastic={0.15}
            onDragEnd={(_: any, info: PanInfo) => {
              if (info.offset.y > 80) onClose();
            }}
            className="relative w-full max-w-lg bg-surface-white rounded-t-3xl shadow-xl overflow-hidden"
            style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.08)' }}
          >
            <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-surface-white z-10">
              <div className="h-1 w-9 rounded-full bg-divider" />
            </div>
            <div className="px-6 pb-8 max-h-[85vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
