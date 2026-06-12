'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BudgetChartProps {
  used: number;
  remaining: number;
  size?: number;
}

function getColorType(pct: number): 'success' | 'warning' | 'error' {
  if (pct >= 80) return 'error';
  if (pct >= 50) return 'warning';
  return 'success';
}

const COLORS = {
  success: { from: '#1DB954', to: '#0ea570' },
  warning: { from: '#f59e0b', to: '#FF9500' },
  error:   { from: '#ef4444', to: '#FF3B30' },
};

export function BudgetChart({ used, remaining, size = 64 }: BudgetChartProps) {
  const total = Math.max(used + remaining, 1);
  const percentage = Math.min((used / total) * 100, 100);
  const colorType = getColorType(percentage);

  const [animatedPercent, setAnimatedPercent] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Math.round(percentage);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 800, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPercent(Math.round(eased * target));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [percentage]);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const percentTextSize = size >= 96 ? 'text-[22px]' : size >= 80 ? 'text-[17px]' : 'text-[13px]';
  const labelTextSize  = size >= 96 ? 'text-[9px] mt-0.5' : 'text-[7px]';

  const gradId = `bg-${colorType}-${size}`;

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* SVG rotated so arc starts at 12 o'clock */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={COLORS[colorType].from} />
            <stop offset="100%" stopColor={COLORS[colorType].to}   />
          </linearGradient>
        </defs>

        {/* Background full-circle track */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--color-surface-gray)"
          strokeWidth={strokeWidth}
        />

        {/* Colored progress arc */}
        <motion.circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: percentage / 100 }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>

      {/* Center label — outside SVG so it doesn't rotate */}
      <div className="text-center z-10 select-none">
        <motion.span
          className={`block font-serif font-bold tracking-tight text-text-primary ${percentTextSize}`}
          key={animatedPercent}
        >
          {animatedPercent}%
        </motion.span>
        <span className={`block text-text-secondary font-semibold tracking-[0.06em] uppercase ${labelTextSize}`}>
          Used
        </span>
      </div>
    </div>
  );
}
