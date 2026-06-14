'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import { ArrowLeft, Wallet, Receipt as ReceiptIcon, FileText, Image as ImageIcon, Users, Shield, Clock, CheckCircle, XCircle, ChartBar, Funnel, ClipboardText, Plus,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { BudgetChart } from '@/components/shared/budget-chart';
import { CategoryBarChart } from '@/components/shared/category-bar-chart';
import { useSidebarStore } from '@/stores/sidebar';
import type { ExpenseStatus } from '@/types';

function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const [displayVal, setDisplayVal] = useState(0);
  const countRef = useRef({ val: 0 });

  useEffect(() => {
    gsap.to(countRef.current, {
      val: value,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayVal(Math.round(countRef.current.val));
      }
    });
  }, [value]);

  return <span className={className}>{displayVal}</span>;
}

function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const [displayVal, setDisplayVal] = useState(0);
  const countRef = useRef({ val: 0 });

  useEffect(() => {
    gsap.to(countRef.current, {
      val: value,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        setDisplayVal(countRef.current.val);
      }
    });
  }, [value]);

  return <span className={className}>{formatCurrency(displayVal)}</span>;
}

export function AdminEventDetailClient({
  deptId,
  eventId,
  initialEvent,
  initialReceipts,
  initialForms,
}: {
  deptId: string;
  eventId: string;
  initialEvent: any;
  initialReceipts: any[];
  initialForms: any[];
}) {
  const [event] = useState<any>(initialEvent);
  const [receipts] = useState<any[]>(initialReceipts);
  const [forms] = useState<any[]>(initialForms);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  // Desktop layout state
  const isMobile = useSidebarStore(s => s.isMobile);
  const [expensesTab, setExpensesTab] = useState<'expenses' | 'report'>('expenses');
  const [filterType, setFilterType] = useState<'all' | 'receipt' | 'no-receipt'>('all');
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | 'all'>('all');
  const [filterDate, setFilterDate] = useState<'newest' | 'oldest'>('newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mergedExpenses = useMemo(() => {
    const items: ({ _type: 'receipt' } & any)[] = receipts.map(r => ({ ...r, _type: 'receipt' as const }));
    const formItems: ({ _type: 'no-receipt' } & any)[] = forms.map(f => ({ ...f, _type: 'no-receipt' as const }));
    let combined = [...items, ...formItems];
    if (filterType === 'receipt') combined = combined.filter(i => i._type === 'receipt');
    if (filterType === 'no-receipt') combined = combined.filter(i => i._type === 'no-receipt');
    if (filterStatus !== 'all') combined = combined.filter(i => i.status === filterStatus);
    combined.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return filterDate === 'newest' ? db - da : da - db;
    });
    return combined;
  }, [receipts, forms, filterType, filterStatus, filterDate]);

  const categoryBreakdown = useMemo(() => {
    const approvedReceipts = receipts.filter(r => r.status === 'approved');
    const approvedForms = forms.filter(f => f.status === 'approved');
    const map = new Map<string, { total: number; count: number }>();
    approvedReceipts.forEach(r => {
      const cat = r.category || 'uncategorized';
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += r.total || 0;
      existing.count += 1;
      map.set(cat, existing);
    });
    approvedForms.forEach(f => {
      const cat = f.expense_type || 'uncategorized';
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += f.amount || 0;
      existing.count += 1;
      map.set(cat, existing);
    });
    return Array.from(map.entries()).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.total - a.total);
  }, [receipts, forms]);

  const kpiGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kpiGridRef.current) {
      gsap.fromTo(
        kpiGridRef.current.children,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }
      );
    }
  }, []);

  if (!event) return <div className="py-8 text-[13px] leading-[18px] text-text-secondary">Event not found.</div>;

  const totalExpenses = useMemo(() => [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0), [receipts, forms]);

  const approvedReceipts = useMemo(() => receipts.filter(r => r.status === 'approved').length, [receipts]);
  const pendingReceipts = useMemo(() => receipts.filter(r => r.status === 'pending').length, [receipts]);
  const rejectedReceipts = useMemo(() => receipts.filter(r => r.status === 'rejected').length, [receipts]);

  const approvedForms = useMemo(() => forms.filter(f => f.status === 'approved').length, [forms]);
  const pendingForms = useMemo(() => forms.filter(f => f.status === 'pending').length, [forms]);
  const rejectedForms = useMemo(() => forms.filter(f => f.status === 'rejected').length, [forms]);

  const backHref = `/admin/departments/${deptId}/events`;

  // Mobile layout — unchanged
  if (isMobile) {
    const budgetPercent = (totalExpenses / Math.max(event?.original_budget || 1, 1)) * 100;
    const remainingBalance = (event?.original_budget || 0) - totalExpenses;
    const filterLabel = (() => {
      if (filterType !== 'all') {
        const items = filterType === 'receipt' ? receipts : forms;
        const count = items.filter(item => filterStatus === 'all' || item.status === filterStatus).length;
        const label = filterType === 'receipt' ? 'receipt' : 'form';
        return `${count} ${label}${count !== 1 ? 's' : ''}`;
      }
      if (filterStatus !== 'all') {
        const count = [...receipts, ...forms].filter(item => item.status === filterStatus).length;
        return `${count} ${filterStatus}`;
      }
      return 'All Expenses';
    })();

    return (
    <div className="bg-[#f8f8f8] min-h-screen">
      {/* Zone 1 — Top Bar */}
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-start gap-3">
          <Link href={backHref} prefetch={true} className="mt-0.5 shrink-0">
            <ArrowLeft className="h-5 w-5 text-[#000000]" weight="bold" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-semibold text-[#000000] leading-tight">{event.name}</h1>
            <p className="text-[12px] text-[#afafaf] mt-0.5">
              {event.officer?.first_name ? formatDate(event.created_at) + ' · ' + event.officer?.first_name + ' ' + event.officer?.last_name : formatDate(event.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Zone 2 — Tab Navigation */}
      <div className="px-4 pt-1 pb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpensesTab('expenses')}
            className={cn(
              'relative px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              expensesTab === 'expenses' ? 'bg-[#000000] text-[#ffffff]' : 'text-[#afafaf]'
            )}
          >
            Expenses
          </button>
          <button
            onClick={() => setExpensesTab('report')}
            className={cn(
              'relative px-5 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              expensesTab === 'report' ? 'bg-[#000000] text-[#ffffff]' : 'text-[#afafaf]'
            )}
          >
            Report
          </button>
        </div>
      </div>

      {/* Zone 3 — Budget Card (always visible) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="px-4 mb-6"
      >
        <div className="bg-[#ffffff] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <p className="text-[42px] font-[700] text-[#000000] tracking-tight">
            {remainingBalance < 0 ? '−' : ''}₱{Number(Math.abs(remainingBalance)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-3 space-y-1.5">
            <div className="text-[13px] text-[#6b6b6b]">
              Total: <span className="text-[#000000] font-medium">₱{(event?.original_budget || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="text-[13px] text-[#6b6b6b]">
              Spent: <span className="text-[#000000] font-medium">₱{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-end items-center mb-1.5">
              <span className="text-[11px] text-[#6b6b6b]">{budgetPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-[#afafaf] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${budgetPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="h-full bg-[#01a550] rounded-full"
              />
            </div>
          </div>
          {remainingBalance < 0 && (
            <div className="text-[11px] text-red-500 mt-3 pt-3 border-t border-gray-100">
              ⚠ Budget exceeded by {formatCurrency(Math.abs(remainingBalance))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Zone 4 — Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          {expensesTab === 'expenses' ? (
            <motion.div
              key="expenses"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Expenses Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[20px] font-[700] text-[#000000]">Expenses</h2>
                  <p className="text-[11px] text-[#afafaf] mt-0.5">{filterLabel}</p>
                </div>
                <div className="relative" ref={filterRef}>
                  <button
                    aria-label="Filter expenses"
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-[#6b6b6b]"
                  >
                    <Funnel className="h-[18px] w-[18px]" weight="regular" />
                  </button>
                  {showFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 bg-[#ffffff] rounded-xl shadow-lg border border-gray-100 p-3 z-50"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Type</p>
                          <div className="flex gap-1">
                            {(['all', 'receipt', 'no-receipt'] as const).map(t => (
                              <button key={t} onClick={() => setFilterType(t)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterType === t ? 'bg-[#000000] text-[#ffffff]' : 'bg-gray-100 text-[#6b6b6b]')}>
                                {t === 'all' ? 'All' : t === 'receipt' ? 'Receipt' : 'No Receipt'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Status</p>
                          <div className="flex gap-1 flex-wrap">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                              <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterStatus === s ? 'bg-[#000000] text-[#ffffff]' : 'bg-gray-100 text-[#6b6b6b]')}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold text-[#6b6b6b] uppercase tracking-wider mb-1.5">Date</p>
                          <div className="flex gap-1">
                            {(['newest', 'oldest'] as const).map(d => (
                              <button key={d} onClick={() => setFilterDate(d)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterDate === d ? 'bg-[#000000] text-[#ffffff]' : 'bg-gray-100 text-[#6b6b6b]')}>
                                {d === 'newest' ? 'Newest' : 'Oldest'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Expenses List */}
              {mergedExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ClipboardText className="h-12 w-12 text-[#d0d0d0]" weight="light" />
                  <p className="mt-4 text-[13px] text-[#afafaf] text-center max-w-[220px] leading-relaxed">
                    No expenses yet for this event.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mergedExpenses.map((item, index) => (
                    <motion.div
                      key={`${item._type}-${item.id}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
                    >
                      {item._type === 'receipt' ? (
                        <button onClick={() => setSelectedReceipt(item)} className="text-left w-full block">
                          <div className="bg-[#ffffff] rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:shadow-md active:-translate-y-0.5 transition-all duration-150">
                            <div className="flex items-start gap-3">
                              <div className="h-[52px] w-[52px] rounded-[10px] overflow-hidden shrink-0 bg-gray-100 relative">
                                {item.image_url ? (
                                  <Image src={item.image_url} alt="" fill className="object-cover" sizes="52px" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-[#6b6b6b]" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[13px] font-medium text-[#000000] truncate">{item.vendor || 'Unknown'}</p>
                                  <span className="shrink-0 text-[11px] font-medium capitalize" style={{
                                    color: item.status === 'approved' ? '#01a550' : item.status === 'pending' ? '#f59e0b' : '#ef4444'
                                  }}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6b6b6b] mt-0.5 capitalize truncate">{item.category}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[13px] font-semibold text-[#000000]">{formatCurrency(item.total)}</span>
                                  <span className="text-[10px] text-[#afafaf]">{formatDate(item.created_at)}</span>
                                </div>
                                {item.profiles && (
                                  <p className="text-[10px] text-[#afafaf] mt-0.5 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <button onClick={() => setSelectedForm(item)} className="text-left w-full block">
                          <div className="bg-[#ffffff] rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:shadow-md active:-translate-y-0.5 transition-all duration-150">
                            <div className="flex items-start gap-3">
                              <div className="h-[52px] w-[52px] rounded-[10px] bg-amber-50 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[13px] font-medium text-[#000000] truncate">{item.expense_name || item.expense_type}</p>
                                  <span className="shrink-0 text-[11px] font-medium capitalize" style={{
                                    color: item.status === 'approved' ? '#01a550' : item.status === 'pending' ? '#f59e0b' : '#ef4444'
                                  }}>
                                    {item.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#6b6b6b] mt-0.5 capitalize truncate">{item.expense_type}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[13px] font-semibold text-[#000000]">{formatCurrency(item.amount)}</span>
                                  <span className="text-[10px] text-[#afafaf]">{formatDate(item.created_at)}</span>
                                </div>
                                {item.profiles && (
                                  <p className="text-[10px] text-[#afafaf] mt-0.5 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Report Header */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[20px] font-[700] text-[#000000]">Summary</h2>
                <Link href={`/admin/departments/${deptId}/reports/${eventId}`} prefetch={true}>
                  <button className="bg-transparent border border-[#000000] rounded-[20px] px-3 py-1 text-[13px] font-medium text-[#000000]">Report</button>
                </Link>
              </div>

              {/* Category Bars */}
              {categoryBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <ClipboardText className="h-12 w-12 text-[#d0d0d0]" weight="light" />
                  <p className="mt-4 text-[13px] text-[#afafaf] text-center max-w-[220px] leading-relaxed">
                    No expenses yet for this event.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const maxTotal = Math.max(...categoryBreakdown.map(d => d.total), 1);
                    return categoryBreakdown.map((entry, index) => {
                      const pct = (entry.total / maxTotal) * 100;
                      return (
                        <motion.div
                          key={entry.category}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-medium text-[#000000] capitalize truncate">{entry.category}</span>
                            <span className="text-[12px] font-semibold text-[#000000] tabular-nums shrink-0 ml-3">
                              ₱{entry.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(pct, 2)}%` }}
                              transition={{ delay: index * 0.06, duration: 0.6, ease: 'easeInOut' }}
                              className="h-full bg-[#02783c] rounded-full"
                            />
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-[13px]">
                      <span className="font-[700] text-[#6b6b6b]">Total Approved</span>
                      <span className="font-[700] text-[#000000]">{formatCurrency(categoryBreakdown.reduce((s, c) => s + c.total, 0))}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Receipt Detail Modal */}
      <ResponsiveDialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)} title={selectedReceipt?.vendor || 'Receipt Details'}>
        {selectedReceipt && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative w-full h-64">{selectedReceipt.image_url && <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />}</div>
            <div className="space-y-3">
              <div><p className="text-[13px] leading-[18px] text-text-secondary">Vendor</p><p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.vendor || 'N/A'}</p></div>
              <div><p className="text-[13px] leading-[18px] text-text-secondary">SI/OR Number</p><p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.si_or_number || 'N/A'}</p></div>
              <div className="grid grid-cols-2 gap-2"><div><p className="text-[13px] leading-[18px] text-text-secondary">Date</p><p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.date || 'N/A'}</p></div><div><p className="text-[13px] leading-[18px] text-text-secondary">Time</p><p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.time || 'N/A'}</p></div></div>
              <div><p className="text-[13px] leading-[18px] text-text-secondary">Category</p><Badge className="bg-primary-tint-bg text-primary-tint-text border-0">{selectedReceipt.category} — {selectedReceipt.confidence || 0}%</Badge></div>
              <Separator />
              {selectedReceipt.items?.map((item: any, i: number) => (<div key={i} className="flex justify-between text-[13px] leading-[18px]"><span className="flex-1 text-text-body">{item.name}</span><span className="w-12 text-right text-text-secondary">{item.qty}</span><span className="w-20 text-right text-text-body">{formatCurrency(item.total)}</span></div>))}
              <Separator />
              <div className="flex justify-between font-semibold"><span className="text-text-primary">Total</span><span className="text-text-primary">{formatCurrency(selectedReceipt.total)}</span></div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium capitalize" style={{ color: selectedReceipt.status === 'approved' ? '#01a550' : selectedReceipt.status === 'pending' ? '#f59e0b' : '#ef4444' }}>{selectedReceipt.status}</span>
                {selectedReceipt.transaction_hash && <Badge className="bg-primary-tint-bg text-primary-tint-text flex items-center gap-1 border-0"><Shield className="h-3 w-3" /> Blockchain Verified</Badge>}
              </div>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* Form Detail Modal */}
      <ResponsiveDialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)} title={selectedForm?.expense_name || ''} description="No-Receipt Form Details">
        {selectedForm && (
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-2 gap-3 text-[15px] leading-[22px]">
              <div className="min-w-0"><p className="text-[13px] leading-[18px] text-text-secondary">Expense Type</p><p className="font-medium capitalize break-words text-text-primary">{selectedForm.expense_type}</p></div>
              <div className="min-w-0"><p className="text-[13px] leading-[18px] text-text-secondary">Amount</p><p className="font-medium text-text-primary">{formatCurrency(selectedForm.amount)}</p></div>
              <div className="min-w-0"><p className="text-[13px] leading-[18px] text-text-secondary">Date Incurred</p><p className="font-medium text-text-primary">{formatDate(selectedForm.date_incurred)}</p></div>
              <div className="min-w-0"><p className="text-[13px] leading-[18px] text-text-secondary">Status</p><span className="text-[11px] font-medium capitalize" style={{ color: selectedForm.status === 'approved' ? '#01a550' : selectedForm.status === 'pending' ? '#f59e0b' : '#ef4444' }}>{selectedForm.status}</span></div>
            </div>
            <Separator />
            <div><p className="text-[13px] leading-[18px] text-text-secondary mb-1">Description</p><p className="text-[15px] leading-[22px] text-text-body whitespace-pre-wrap break-words">{selectedForm.description}</p></div>
            {selectedForm.formula_breakdown && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-1">Formula Breakdown</p><p className="text-[15px] leading-[22px] text-text-secondary whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p></div></>)}
            {selectedForm.transport_data && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Transport Details</p><div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]"><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Mode</p><p className="text-text-body">{selectedForm.transport_data.mode}</p></div><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Route</p><p className="text-text-body">{selectedForm.transport_data.route}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Fare/Person</p><p className="text-text-body">{formatCurrency(selectedForm.transport_data.fare_per_person)}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.transport_data.persons}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Trips</p><p className="text-text-body">{selectedForm.transport_data.trips}</p></div></div></div></>)}
            {selectedForm.food_data && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Food / Meals Details</p><div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]"><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Meal Type</p><p className="text-text-body">{selectedForm.food_data.meal_type}</p></div><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Vendor</p><p className="text-text-body">{selectedForm.food_data.vendor}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Cost/Person</p><p className="text-text-body">{formatCurrency(selectedForm.food_data.cost_per_person)}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.food_data.persons}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Meals</p><p className="text-text-body">{selectedForm.food_data.meals}</p></div></div></div></>)}
            {selectedForm.supplies_data?.length > 0 && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Supplies Items</p><div className="space-y-1 text-[15px] leading-[22px]">{selectedForm.supplies_data.map((item: any, i: number) => (<div key={i} className="flex justify-between text-[13px] leading-[18px] border-b border-divider pb-1"><span className="flex-1 min-w-0 break-words text-text-body">{item.item_name}</span><span className="w-16 text-right text-text-secondary">{item.qty}x</span><span className="w-20 text-right text-text-secondary">{formatCurrency(item.unit_cost)}</span><span className="w-20 text-right font-medium text-text-primary">{formatCurrency(item.total)}</span></div>))}</div></div></>)}
            {selectedForm.labor_data && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Labor / Service Details</p><div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]"><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Service Type</p><p className="text-text-body">{selectedForm.labor_data.service_type}</p></div><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Vendor</p><p className="text-text-body">{selectedForm.labor_data.vendor_name || selectedForm.labor_data.vendor}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Rate</p><p className="text-text-body">{formatCurrency(selectedForm.labor_data.rate)}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.labor_data.persons}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Duration</p><p className="text-text-body">{selectedForm.labor_data.duration} {selectedForm.labor_data.duration_unit}</p></div></div></div></>)}
            {selectedForm.other_data && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Other Details</p><div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]"><div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Item</p><p className="text-text-body">{selectedForm.other_data.expense_name}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Unit Cost</p><p className="text-text-body">{formatCurrency(selectedForm.other_data.unit_cost)}</p></div><div><p className="text-[13px] leading-[18px] text-text-placeholder">Quantity</p><p className="text-text-body">{selectedForm.other_data.qty}</p></div></div></div></>)}
            {selectedForm.witnesses?.length > 0 && (<><Separator /><div><p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Witnesses</p><div className="space-y-1 text-[15px] leading-[22px]">{selectedForm.witnesses.filter((w: any) => !w._marker).map((w: any, i: number) => (<div key={i} className="text-[13px] leading-[18px]"><span className="font-medium text-text-primary">{w.name}</span>{w.role && <span className="text-text-secondary"> — {w.role}</span>}</div>))}</div></div></>)}
            <Separator />
            <div className="flex items-center gap-2"><div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-primary text-white' : 'border-divider')}>{selectedForm.certification && <CheckCircle className="h-3 w-3 text-white" />}</div><span className="text-[13px] leading-[18px] text-text-secondary">Certified true and correct</span></div>
            {selectedForm.rejection_reason && (<><Separator /><div className="text-[13px] leading-[18px] text-error bg-error/10 rounded-xl p-3"><p className="font-medium mb-1">Rejection Reason</p><p className="whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p></div></>)}
            {selectedForm.transaction_hash && (<><Separator /><Badge className="bg-primary-tint-bg text-primary-tint-text flex items-center gap-1 border-0"><Shield className="h-3 w-3" /> Blockchain Verified</Badge></>)}
          </div>
        )}
      </ResponsiveDialog>
    </div>
    );
  }

  // Desktop layout
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} prefetch={true} className="text-text-secondary hover:text-text-primary transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] leading-[30px] font-[700] tracking-[-0.04em] text-text-primary">{event.name}</h1>
          <p className="text-[13px] leading-[18px] text-text-secondary mt-0.5">
            {formatDate(event.created_at)} &middot; {event.officer?.first_name} {event.officer?.last_name}
          </p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'} className="shrink-0">
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-row gap-6 items-start">
        {/* LEFT PANEL */}
        <div className="flex-[7] min-w-0 space-y-5">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="inline-flex bg-surface-gray p-0.5 rounded-xl">
              <button
                onClick={() => setExpensesTab('expenses')}
                className={cn('relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300', expensesTab === 'expenses' ? 'bg-surface-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-body')}
              >
                {expensesTab === 'expenses' && (
                  <motion.div layoutId="tab-pill-admin" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ClipboardText className="h-3.5 w-3.5" /> Expenses
                </span>
              </button>
              <button
                onClick={() => setExpensesTab('report')}
                className={cn('relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300', expensesTab === 'report' ? 'bg-surface-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-body')}
              >
                {expensesTab === 'report' && (
                  <motion.div layoutId="tab-pill-admin" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ChartBar className="h-3.5 w-3.5" /> Report
                </span>
              </button>
            </div>

            <div className="flex-1" />

            {/* Filter */}
            <div className="relative" ref={filterRef}>
              <button aria-label="Filter expenses" onClick={() => setShowFilterDropdown(!showFilterDropdown)} className={cn('h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200', showFilterDropdown ? 'bg-surface-gray text-text-primary' : 'text-text-secondary hover:bg-surface-gray hover:text-text-body')}>
                <Funnel className="h-4 w-4" />
              </button>
              {showFilterDropdown && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15, ease: 'easeOut' }} className="absolute right-0 top-full mt-2 w-56 bg-surface-white rounded-2xl shadow-lg border border-divider/40 p-3 z-50">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Type</p>
                      <div className="flex gap-1">
                        {(['all', 'receipt', 'no-receipt'] as const).map(t => (
                          <button key={t} onClick={() => setFilterType(t)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all', filterType === t ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>{t === 'all' ? 'All' : t === 'receipt' ? 'Receipt' : 'No Receipt'}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Status</p>
                      <div className="flex gap-1 flex-wrap">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                          <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterStatus === s ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Date</p>
                      <div className="flex gap-1">
                        {(['newest', 'oldest'] as const).map(d => (
                          <button key={d} onClick={() => setFilterDate(d)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterDate === d ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>{d === 'newest' ? 'Newest' : 'Oldest'}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {expensesTab === 'expenses' ? (
              <motion.div key="expenses" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                {mergedExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-surface-gray flex items-center justify-center animate-breathe-subtle">
                      <ClipboardText className="h-8 w-8 text-text-placeholder" />
                    </div>
                    <p className="text-[15px] leading-[22px] text-text-secondary font-medium">No expenses yet</p>
                    <p className="text-[13px] leading-[18px] text-text-placeholder -mt-2">No entries found for this event.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mergedExpenses.map((item, index) => (
                      <motion.div key={`${item._type}-${item.id}`} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 22 }}>
                        {item._type === 'receipt' ? (
                          <button onClick={() => setSelectedReceipt(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-surface-gray overflow-hidden shrink-0 relative">
                                  {item.image_url ? <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" /> : <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-text-placeholder" /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.vendor || 'Unknown'}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>{item.status}</Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize truncate">{item.category}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.total)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>}
                                </div>
                              </div>
                            </Card>
                          </button>
                        ) : (
                          <button onClick={() => setSelectedForm(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                  <FileText className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.expense_name || item.expense_type}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>{item.status}</Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize">{item.expense_type}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.amount)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>}
                                </div>
                              </div>
                            </Card>
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="report" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20">
                  <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-[15px] font-[590] tracking-[-0.02em] text-text-primary">Category Breakdown</CardTitle>
                      <CardDescription className="text-[11px] text-text-secondary mt-0.5">Approved expenses by category</CardDescription>
                    </div>
                    <Link href={`/admin/departments/${deptId}/reports/${eventId}`} prefetch={true}>
                      <Button variant="outline" size="sm" className="rounded-xl text-[11px] h-8">
                        <FileText className="h-3.5 w-3.5 mr-1" /> Report
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <CategoryBarChart data={categoryBreakdown} />
                    {categoryBreakdown.length > 0 && (
                      <><Separator className="my-4" /><div className="flex items-center justify-between text-[13px]"><span className="text-text-secondary">Total Approved</span><span className="font-semibold text-text-primary">{formatCurrency(categoryBreakdown.reduce((s, c) => s + c.total, 0))}</span></div></>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="flex-[3] hidden lg:block sticky top-24 self-start">
          <div className="space-y-5 animate-slide-in-right">
            <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <BudgetChart used={totalExpenses} remaining={Math.max(event.original_budget - totalExpenses, 0)} size={160} />
                  <div className="w-full mt-5 grid grid-cols-3 divide-x divide-divider/60">
                    <div className="text-center pr-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Total</p>
                      <AnimatedCurrency value={event.original_budget} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Spent</p>
                      <AnimatedCurrency value={totalExpenses} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center pl-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Remain</p>
                      <AnimatedCurrency value={event.original_budget - totalExpenses} className={cn('text-[14px] font-semibold leading-tight block mt-0.5', (event.original_budget - totalExpenses) < 0 ? 'text-error' : 'text-text-primary')} />
                    </div>
                  </div>
                  {(event.original_budget - totalExpenses) < 0 && (
                    <div className="mt-3 w-full px-3 py-1.5 bg-red-50 rounded-xl text-[10px] font-medium text-error text-center">
                      Budget exceeded by {formatCurrency(Math.abs(event.original_budget - totalExpenses))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-primary-tint-bg flex items-center justify-center"><ReceiptIcon className="h-3 w-3 text-primary" /></div>
                      <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Receipts</span>
                    </div>
                    <AnimatedCount value={receipts.length} className="text-[22px] font-serif font-bold tracking-tight text-text-primary" />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center"><FileText className="h-3 w-3 text-amber-600" /></div>
                      <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">No-Rcpt</span>
                    </div>
                    <AnimatedCount value={forms.length} className="text-[22px] font-serif font-bold tracking-tight text-text-primary" />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Detail Modal */}
      <ResponsiveDialog
        open={!!selectedReceipt}
        onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}
        title={selectedReceipt?.vendor || 'Receipt'}
      >
        <ScrollArea className="max-h-[70vh] pr-4">
          {selectedReceipt && (
            <div className="space-y-4">
              {selectedReceipt.image_url && (
                <div className="relative w-full h-64">
                  <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-lg border object-cover" sizes="100vw" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-[15px] leading-[22px]">
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">SI/OR Number</p>
                  <p className="font-medium">{selectedReceipt.si_or_number || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Category</p>
                  <p className="font-medium">{selectedReceipt.category || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Date</p>
                  <p className="font-medium">{selectedReceipt.date || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Total</p>
                  <p className="font-medium">{formatCurrency(selectedReceipt.total || 0)}</p>
                </div>
              </div>
              {selectedReceipt.items?.length > 0 && (
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary mb-1">Items</p>
                  <div className="space-y-1">
                    {selectedReceipt.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-[11px] leading-[14px] bg-surface-gray p-2 rounded">
                        <span>{item.name}</span>
                        <span>{item.qty} x {formatCurrency(item.unit_price)} = {formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-[11px] leading-[14px] text-text-secondary">
                {selectedReceipt.transaction_hash && (
                  <div>
                    <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Tx: {selectedReceipt.transaction_hash.slice(0, 12)}...</p>
                  </div>
                )}
                <div>
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(selectedReceipt.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </ResponsiveDialog>

      {/* Form Detail Modal */}
      <ResponsiveDialog
        open={!!selectedForm}
        onOpenChange={(open) => { if (!open) setSelectedForm(null); }}
        title={selectedForm?.expense_name || 'No-Receipt Form'}
      >
        <ScrollArea className="max-h-[80vh] pr-4">
          {selectedForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[15px] leading-[22px]">
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Expense Type</p>
                  <p className="font-medium capitalize">{selectedForm.expense_type}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedForm.amount || 0)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] leading-[14px] text-text-secondary">Description</p>
                  <p className="font-medium whitespace-pre-wrap break-words">{selectedForm.description || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Date Incurred</p>
                  <p className="font-medium">{selectedForm.date_incurred || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary">Status</p>
                  <Badge variant={selectedForm.status as any}>{selectedForm.status}</Badge>
                </div>
              </div>
              {selectedForm.formula_breakdown && (
                <div>
                  <p className="text-[11px] leading-[14px] text-text-secondary mb-1">Formula Breakdown</p>
                  <p className="text-[11px] leading-[14px] bg-surface-gray p-2 rounded whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                </div>
              )}
              {selectedForm.rejection_reason && (
                <div>
                  <p className="text-[11px] leading-[14px] text-error mb-1">Rejection Reason</p>
                  <p className="text-[11px] leading-[14px] bg-red-50 p-2 rounded whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-[11px] leading-[14px] text-text-secondary">
                {selectedForm.transaction_hash && (
                  <div>
                    <p className="flex items-center gap-1"><Shield className="h-3 w-3" /> Tx: {selectedForm.transaction_hash.slice(0, 12)}...</p>
                  </div>
                )}
                <div>
                  <p className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(selectedForm.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </ResponsiveDialog>
    </div>
  );
}
