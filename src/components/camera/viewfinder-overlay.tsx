'use client';

import { cn } from '@/lib/utils/cn';

interface ViewfinderOverlayProps {
  focusFeedback: 'blurry' | 'fair' | 'good' | 'unknown';
  stability: 'stable' | 'unstable' | 'unknown';
}

const bracketColor = (focus: ViewfinderOverlayProps['focusFeedback']) => {
  switch (focus) {
    case 'blurry': return 'bg-rose-400/90';
    case 'fair': return 'bg-amber-400/90';
    case 'good': return 'bg-emerald-400/90';
    default: return 'bg-white/90';
  }
};

export function ViewfinderOverlay({ focusFeedback, stability }: ViewfinderOverlayProps) {
  const ready = focusFeedback === 'good' && stability !== 'unstable';
  const color = bracketColor(focusFeedback);

  const getFeedbackLine = () => {
    if (focusFeedback === 'blurry' && stability === 'unstable') return 'Blurry — hold steady';
    if (focusFeedback === 'blurry') return 'Too blurry — move closer or improve lighting';
    if (focusFeedback === 'fair' && stability === 'unstable') return 'Almost there — hold still';
    if (focusFeedback === 'fair') return 'Getting better...';
    if (focusFeedback === 'good' && stability === 'unstable') return 'Hold steady...';
    if (focusFeedback === 'good') return 'Perfect! Tap to capture';
    return 'Position receipt within frame';
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Semi-transparent borders */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Clear center rectangle */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[70vw] max-w-[350px] aspect-[3/4]">
          {/* Corner brackets */}
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-8 h-8">
            <div className={cn('absolute top-0 left-0 w-[3px] h-full rounded-full shadow-lg transition-colors duration-300', color)} />
            <div className={cn('absolute top-0 left-0 w-full h-[3px] rounded-full shadow-lg transition-colors duration-300', color)} />
          </div>
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-8 h-8">
            <div className={cn('absolute top-0 right-0 w-[3px] h-full rounded-full shadow-lg transition-colors duration-300', color)} />
            <div className={cn('absolute top-0 right-0 w-full h-[3px] rounded-full shadow-lg transition-colors duration-300', color)} />
          </div>
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-8 h-8">
            <div className={cn('absolute bottom-0 left-0 w-[3px] h-full rounded-full shadow-lg transition-colors duration-300', color)} />
            <div className={cn('absolute bottom-0 left-0 w-full h-[3px] rounded-full shadow-lg transition-colors duration-300', color)} />
          </div>
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8">
            <div className={cn('absolute bottom-0 right-0 w-[3px] h-full rounded-full shadow-lg transition-colors duration-300', color)} />
            <div className={cn('absolute bottom-0 right-0 w-full h-[3px] rounded-full shadow-lg transition-colors duration-300', color)} />
          </div>
        </div>
      </div>

      {/* Stability + Focus feedback merged into one prominent pill */}
      <div className="absolute top-6 left-0 right-0 flex justify-center z-10">
        <div className={cn(
          'px-4 py-2 rounded-full backdrop-blur-sm transition-colors duration-300',
          ready ? 'bg-emerald-500/60' : 'bg-black/50'
        )}>
          <span className={cn(
            'text-sm font-semibold text-white transition-colors',
            ready && 'animate-pulse'
          )}>
            {getFeedbackLine()}
          </span>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
        <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm">
          <p className="text-xs text-white/70 text-center">
            Keep the receipt flat and well-lit
          </p>
        </div>
      </div>
    </div>
  );
}
