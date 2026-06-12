'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface BudgetChartProps {
  used: number;
  remaining: number;
}

function getColor(pct: number): string {
  if (pct >= 100) return '#1DB954';
  if (pct >= 80) return '#FF6B6B';
  if (pct >= 50) return '#FFB347';
  return '#1DB954';
}

export function BudgetChart({ used, remaining }: BudgetChartProps) {
  const total = Math.max(used + remaining, 1);
  const percentage = Math.min((used / total) * 100, 100);
  const color = getColor(percentage);

  const [animatedPercent, setAnimatedPercent] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Math.round(percentage);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const startTime = performance.now();
    const startVal = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 1000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * eased);
      setAnimatedPercent(current);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [percentage]);

  const size = 96;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2 - 1;
  const gapAngle = 90;

  const polarToCartesian = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const startAngle = gapAngle / 2;
  const endAngle = 360 - gapAngle / 2;

  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 overflow-visible">
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#F0F0F2"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <motion.path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: percentage / 100 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="text-center z-10">
        <motion.span
          className="block text-[18px] leading-[22px] font-[650] tracking-[-0.02em] text-text-primary"
          key={animatedPercent}
        >
          {animatedPercent}%
        </motion.span>
        <span className="block text-[8px] leading-[8px] text-text-secondary font-medium tracking-[0.03em] mt-px">
          Used
        </span>
      </div>
    </div>
  );
}
