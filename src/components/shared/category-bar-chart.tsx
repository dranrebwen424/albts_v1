'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { motion } from 'framer-motion';

interface CategoryData {
  category: string;
  total: number;
  count: number;
}

const CATEGORY_COLORS = [
  '#1DB954',
  '#10B981',
  '#06B6D4',
  '#0D9488',
  '#34D399',
  '#22C55E',
  '#17A349',
  '#4ADE80',
  '#059669',
  '#0A5C2E',
];

export function CategoryBarChart({ data: rawData }: { data: CategoryData[] }) {
  const [animatedData, setAnimatedData] = useState<CategoryData[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedData(rawData), 100);
    return () => clearTimeout(timeout);
  }, [rawData]);

  if (!rawData.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="h-12 w-12 rounded-2xl bg-surface-gray flex items-center justify-center animate-breathe-subtle">
          <BarChart width={24} height={24} className="text-text-placeholder">
            <Bar dataKey="total" fill="currentColor" />
          </BarChart>
        </div>
        <p className="text-[13px] leading-[18px] text-text-secondary">
          No approved expenses yet to report
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...rawData.map(d => d.total), 1);

  return (
    <div className="space-y-1 py-2">
      {rawData.map((entry, index) => {
        const pct = (entry.total / maxTotal) * 100;
        return (
          <motion.div
            key={entry.category}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, ease: [0.34, 1.56, 0.64, 1], duration: 0.4 }}
            className="group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-text-primary capitalize truncate">
                {entry.category}
              </span>
              <span className="text-[11px] font-semibold text-text-primary tabular-nums ml-2 shrink-0">
                ₱{entry.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative h-6 rounded-lg bg-surface-gray overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 2)}%` }}
                transition={{ delay: index * 0.08, duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
                className="h-full rounded-lg"
                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
