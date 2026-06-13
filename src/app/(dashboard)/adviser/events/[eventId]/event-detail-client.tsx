'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getEvent, getReceipts, getNoReceiptForms, approveNoReceiptForm, rejectNoReceiptForm, approveFinancialReport, getFinancialReport } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Wallet, Receipt as ReceiptIcon, FileText, CheckCircle, XCircle, Shield, Eye, Image as ImageIcon, Spinner, ChartBar, Funnel, ClipboardText} from '@phosphor-icons/react';
import { toast } from 'sonner';
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

export function AdviserEventDetailClient({
  eventId,
  initialEvent,
  initialReceipts,
  initialForms,
  initialReport,
}: {
  eventId: string;
  initialEvent: any;
  initialReceipts: any[];
  initialForms: any[];
  initialReport: any;
}) {
  const [event, setEvent] = useState<any>(initialEvent);
  const [receipts, setReceipts] = useState<any[]>(initialReceipts);
  const [forms, setForms] = useState<any[]>(initialForms);
  const [report, setReport] = useState<any>(initialReport);

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
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [approvingForm, setApprovingForm] = useState(false);
  const [rejectingForm, setRejectingForm] = useState(false);
  const [approvingReport, setApprovingReport] = useState(false);

  // Background polling to sync with pending page changes — pause when hidden
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const [f, r] = await Promise.all([
        getNoReceiptForms(eventId),
        getFinancialReport(eventId).catch(() => null),
      ]);
      setForms(f);
      if (r) setReport(r);
    }, 30000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Desktop layout state
  const { isMobile } = useSidebarStore();
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

  const handleApproveForm = async (formId: string) => {
    if (approvingForm || rejectingForm) return;
    setApprovingForm(true);
    try {
      await approveNoReceiptForm(formId, eventId);
      toast.success('Form approved');
      const f = await getNoReceiptForms(eventId);
      setForms(f);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApprovingForm(false);
    }
  };

  const handleRejectForm = async (formId: string) => {
    if (rejectingForm || approvingForm) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setRejectingForm(true);
    try {
      await rejectNoReceiptForm(formId, eventId, rejectReason);
      toast.success('Form rejected');
      setRejectTarget(null);
      setRejectReason('');
      const f = await getNoReceiptForms(eventId);
      setForms(f);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRejectingForm(false);
    }
  };

  const handleApproveReport = async () => {
    if (!report || approvingReport) return;
    setApprovingReport(true);
    try {
      await approveFinancialReport(report.id, eventId);
      toast.success('Financial Statement approved');
      const r = await getFinancialReport(eventId);
      setReport(r);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApprovingReport(false);
    }
  };

  if (!event) return <div>Event not found</div>;

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0);

  // Receipt KPIs
  const approvedReceipts = receipts.filter(r => r.status === 'approved').length;
  const pendingReceipts = receipts.filter(r => r.status === 'pending').length;
  const rejectedReceipts = receipts.filter(r => r.status === 'rejected').length;

  // Form KPIs
  const approvedForms = forms.filter(f => f.status === 'approved').length;
  const pendingForms = forms.filter(f => f.status === 'pending').length;
  const rejectedForms = forms.filter(f => f.status === 'rejected').length;

  const backHref = '/adviser/events';

  if (isMobile) {
    return (
    <div className="space-y-6">
      {/* Over-budget banner */}
      {event.budget < 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-600 dark:text-red-400 text-sm font-medium">
            This event exceeds its budget by {formatCurrency(Math.abs(event.budget))}.
          </span>
        </div>
      )}

      {/* KPI Dashboard */}
      <div ref={kpiGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Budget Overview */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="h-full"
        >
          <Card className="h-full bg-surface-white/85 backdrop-blur-md border border-divider/40 shadow-soft hover:shadow-[0_8px_30px_rgba(29,185,84,0.08)] transition-all duration-300">
            <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Budget Overview</CardTitle>
              <Wallet className="h-4 w-4 text-text-secondary" />
            </CardHeader>
            <CardContent className="!p-0">
              <div className="flex">
                <div className="flex-[3] flex items-center justify-center py-5 pl-5 pr-3">
                  <BudgetChart used={totalExpenses} remaining={event.budget} size={108} />
                </div>
                <div className="flex-[2] flex flex-col justify-center gap-2 pt-4 pb-5 pr-5 pl-4">
                  <div>
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">Total</p>
                    <AnimatedCurrency value={totalExpenses + event.budget} className="text-[12px] font-semibold text-text-primary leading-tight" />
                  </div>
                  <div className="h-px bg-divider/50" />
                  <div>
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">Spent</p>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <AnimatedCurrency value={totalExpenses} className="text-[12px] font-semibold text-text-primary leading-tight" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">Remaining</p>
                    <div className="flex items-center gap-1">
                      <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', event.budget < 0 ? 'bg-error animate-pulse' : 'bg-text-secondary/30')} />
                      <AnimatedCurrency
                        value={event.budget}
                        className={cn('text-[12px] font-semibold leading-tight', event.budget < 0 ? 'text-error' : 'text-text-primary')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Receipts */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="h-full"
        >
          <Card className="h-full bg-surface-white/85 backdrop-blur-md border border-divider/40 shadow-soft hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 px-5 pt-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Receipts</CardTitle>
              <ReceiptIcon className="h-4 w-4 text-text-secondary" />
            </CardHeader>
            <CardContent className="!p-5">
              <div className="flex items-baseline gap-1.5 mb-3.5">
                <AnimatedCount value={receipts.length} className="text-[32px] leading-[38px] font-serif font-bold tracking-tight text-text-primary" />
                <span className="text-xs text-text-secondary font-medium">total items</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-tint-bg text-primary-tint-text transition-colors hover:bg-primary-tint-bg/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <AnimatedCount value={approvedReceipts} /> Approved
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 relative overflow-hidden transition-colors hover:bg-amber-100/70">
                  {pendingReceipts > 0 ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <AnimatedCount value={pendingReceipts} /> Pending
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-error transition-colors hover:bg-red-100/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-error" />
                  <AnimatedCount value={rejectedReceipts} /> Rejected
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* No-Receipt Forms */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2, ease: "easeOut" } }}
          whileTap={{ scale: 0.98 }}
          className="h-full"
        >
          <Card className="h-full bg-surface-white/85 backdrop-blur-md border border-divider/40 shadow-soft hover:shadow-md transition-all duration-300">
            <CardHeader className="pb-2 px-5 pt-5 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-semibold text-text-secondary uppercase tracking-wider">No-Receipt Forms</CardTitle>
              <FileText className="h-4 w-4 text-text-secondary" />
            </CardHeader>
            <CardContent className="!p-5">
              <div className="flex items-baseline gap-1.5 mb-3.5">
                <AnimatedCount value={forms.length} className="text-[32px] leading-[38px] font-serif font-bold tracking-tight text-text-primary" />
                <span className="text-xs text-text-secondary font-medium">total items</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-tint-bg text-primary-tint-text transition-colors hover:bg-primary-tint-bg/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <AnimatedCount value={approvedForms} /> Approved
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 relative overflow-hidden transition-colors hover:bg-amber-100/70">
                  {pendingForms > 0 ? (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <AnimatedCount value={pendingForms} /> Pending
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-error transition-colors hover:bg-red-100/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-error" />
                  <AnimatedCount value={rejectedForms} /> Rejected
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="forms">
        <TabsList>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> No-Receipt Forms
          </TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4" /> Receipts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-3">
          <motion.div
            key="forms"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          {/* Needs Review — truly pending, no rejection_reason */}
          {forms.filter(f => f.status === 'pending' && !f.rejection_reason).length > 0 && (
            <>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Needs Review</p>
              {forms.filter(f => f.status === 'pending' && !f.rejection_reason).map(form => (
                <div key={form.id} onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
                  <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{form.expense_name}</span>
                            <Badge>{form.expense_type}</Badge>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Submitted by: {form.profiles?.first_name} {form.profiles?.last_name} | {formatDate(form.created_at)}
                          </p>
                          <p className="text-sm font-semibold mt-2">{formatCurrency(form.amount)}</p>
                          {form.formula_breakdown && (
                            <p className="text-xs text-neutral-400 mt-1 break-words">{form.formula_breakdown}</p>
                          )}
                          {form.witnesses?.length > 0 && (
                            <div className="mt-2 text-xs text-neutral-500">
                              <span className="font-medium">Witnesses:</span>{' '}
                              {form.witnesses.filter((w: any) => !w._marker).map((w: any) => w.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="default" onClick={() => handleApproveForm(form.id)} disabled={approvingForm || rejectingForm}>
                            {approvingForm ? <Spinner className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                            {approvingForm ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectTarget(form.id)} disabled={rejectingForm || approvingForm}>
                            {rejectingForm ? <Spinner className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}

          {/* Waiting for Response — pending with rejection_reason, officer needs to resubmit */}
          {forms.filter(f => f.status === 'pending' && f.rejection_reason).length > 0 && (
            <>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-4">Waiting for Officer Response</p>
              {forms.filter(f => f.status === 'pending' && f.rejection_reason).map(form => (
                <div key={form.id} onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
                  <Card className="border-l-4 border-l-blue-400 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{form.expense_name}</span>
                            <Badge variant="pending">Waiting</Badge>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                          <p className="text-sm font-semibold mt-1">{formatCurrency(form.amount)}</p>
                          {form.rejection_reason && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                              Rejected: <span className="min-w-0 break-words">{form.rejection_reason}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 ml-4">Awaiting resubmission</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}

          {/* Processed — approved or permanently rejected */}
          {forms.filter(f => f.status !== 'pending').length > 0 && (
            <>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mt-4">Processed</p>
              {forms.filter(f => f.status !== 'pending').map(form => (
                <div key={form.id} onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
                  <Card className="hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{form.expense_name}</span>
                            <Badge variant={form.status as any}>{form.status}</Badge>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                          <p className="text-sm font-semibold mt-1">{formatCurrency(form.amount)}</p>
                          {form.rejection_reason && (
                            <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                              Reason: <span className="min-w-0 break-words">{form.rejection_reason}</span>
                            </div>
                          )}
                        </div>
                        {form.transaction_hash && (
                          <Badge variant="success" className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </>
          )}

          {forms.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 text-sm text-neutral-500">No forms yet</CardContent>
            </Card>
          )}
          </motion.div>
        </TabsContent>

        <TabsContent value="receipts" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <motion.div
            key="receipts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="contents"
          >
          {receipts.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="text-center py-8 text-sm text-neutral-500">No receipts yet</CardContent>
            </Card>
          )}
          {receipts.map(receipt => (
            <div key={receipt.id} onClick={() => setSelectedReceipt(receipt)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedReceipt(receipt)} className="text-left">
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0 relative">
                      {receipt.image_url && <Image src={receipt.image_url} alt="" fill className="object-cover" sizes="48px" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{receipt.vendor || 'Unknown'}</p>
                      <p className="text-xs text-neutral-500">{formatCurrency(receipt.total)}</p>
                      <Badge variant={receipt.status as any} className="text-[10px] mt-1">{receipt.status}</Badge>
                      {receipt.transaction_hash && (
                        <Badge variant="success" className="text-[10px] ml-1"><Shield className="h-2.5 w-2.5" /></Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Financial Report Navigation */}
      {receipts.filter(r => r.status === 'approved').length > 0 || forms.filter(f => f.status === 'approved').length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Link href={`/adviser/reports/${eventId}`} prefetch={true}>
                <Button variant="secondary" size="sm">
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> View Financial Report
                </Button>
              </Link>
              {report && (
                <Badge variant={report.status as any}>{report.status === 'approved' ? 'Approved' : 'Pending Review'}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {report && report.status === 'pending' && (
        <div className="flex justify-end">
          <Button size="sm" onClick={handleApproveReport} disabled={approvingReport}>
            {approvingReport ? <Spinner className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
            {approvingReport ? 'Approving...' : 'Approve Financial Statement'}
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <ResponsiveDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}
        title="Reject Form"
        description="Provide a reason for rejection"
      >
        <div className="space-y-4">
          <Label>Rejection Reason</Label>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this form is being rejected..." rows={4} />
          <Button variant="destructive" className="w-full" onClick={() => rejectTarget && handleRejectForm(rejectTarget)} disabled={rejectingForm}>
            {rejectingForm ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : null}
            {rejectingForm ? 'Submitting...' : 'Submit Rejection'}
          </Button>
        </div>
      </ResponsiveDialog>

      {/* Form Detail Modal */}
      <ResponsiveDialog
        open={!!selectedForm}
        onOpenChange={(open) => !open && setSelectedForm(null)}
        title={selectedForm?.expense_name || ''}
        description="No-Receipt Form Details"
      >
        {selectedForm && (
          <>
              <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Expense Type</p>
                    <p className="font-medium capitalize break-words">{selectedForm.expense_type}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedForm.amount)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Date Incurred</p>
                    <p className="font-medium">{formatDate(selectedForm.date_incurred)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500">Status</p>
                    <Badge variant={selectedForm.status as any}>{selectedForm.status}</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs text-neutral-500 mb-1">Submitted By</p>
                  <p className="text-sm break-words">{selectedForm.profiles?.first_name} {selectedForm.profiles?.last_name}</p>
                </div>

                <div>
                  <p className="text-xs text-neutral-500 mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap break-words">{selectedForm.description}</p>
                </div>

                {selectedForm.formula_breakdown && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Formula Breakdown</p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                    </div>
                  </>
                )}

                {selectedForm.transport_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Transport Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Mode</p><p>{selectedForm.transport_data.mode}</p></div>
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Route</p><p>{selectedForm.transport_data.route}</p></div>
                        <div><p className="text-xs text-neutral-400">Fare/Person</p><p>{formatCurrency(selectedForm.transport_data.fare_per_person)}</p></div>
                        <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.transport_data.persons}</p></div>
                        <div><p className="text-xs text-neutral-400">Trips</p><p>{selectedForm.transport_data.trips}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.food_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Food / Meals Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Meal Type</p><p>{selectedForm.food_data.meal_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Vendor</p><p>{selectedForm.food_data.vendor}</p></div>
                        <div><p className="text-xs text-neutral-400">Cost/Person</p><p>{formatCurrency(selectedForm.food_data.cost_per_person)}</p></div>
                        <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.food_data.persons}</p></div>
                        <div><p className="text-xs text-neutral-400">Meals</p><p>{selectedForm.food_data.meals}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.supplies_data?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Supplies Items</p>
                      <div className="space-y-1 text-sm">
                        {selectedForm.supplies_data.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-1">
                            <span className="flex-1 min-w-0 break-words">{item.item_name}</span>
                            <span className="w-16 text-right">{item.qty}x</span>
                            <span className="w-20 text-right">{formatCurrency(item.unit_cost)}</span>
                            <span className="w-20 text-right font-medium">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.labor_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Labor / Service Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Service Type</p><p>{selectedForm.labor_data.service_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Vendor</p><p>{selectedForm.labor_data.vendor_name || selectedForm.labor_data.vendor}</p></div>
                        <div><p className="text-xs text-neutral-400">Rate</p><p>{formatCurrency(selectedForm.labor_data.rate)}</p></div>
                        <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.labor_data.persons}</p></div>
                        <div><p className="text-xs text-neutral-400">Duration</p><p>{selectedForm.labor_data.duration} {selectedForm.labor_data.duration_unit}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.other_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Other Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Item</p><p>{selectedForm.other_data.expense_name}</p></div>
                        <div><p className="text-xs text-neutral-400">Unit Cost</p><p>{formatCurrency(selectedForm.other_data.unit_cost)}</p></div>
                        <div><p className="text-xs text-neutral-400">Quantity</p><p>{selectedForm.other_data.qty}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.witnesses?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-neutral-500 mb-2 font-semibold">Witnesses</p>
                      <div className="space-y-1 text-sm">
                        {selectedForm.witnesses.filter((w: any) => !w._marker).map((w: any, i: number) => (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{w.name}</span>
                            {w.role && <span className="text-neutral-500"> — {w.role}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex items-center gap-2">
                  <div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-neutral-900 dark:bg-white' : 'border-neutral-300 dark:border-neutral-700')}>
                    {selectedForm.certification && <CheckCircle className="h-3 w-3 text-white dark:text-neutral-900" />}
                  </div>
                  <span className="text-xs text-neutral-500">Certified true and correct</span>
                </div>

                {selectedForm.rejection_reason && (
                  <>
                    <Separator />
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="font-medium mb-1">Rejection Reason</p>
                      <p className="whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                    </div>
                  </>
                )}

                {selectedForm.transaction_hash && (
                  <>
                    <Separator />
                    <Badge variant="success" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Blockchain Verified
                    </Badge>
                  </>
                )}
              </div>
            </>
          )}
      </ResponsiveDialog>

      {/* Receipt Detail Modal */}
      <ResponsiveDialog
        open={!!selectedReceipt}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
        title={selectedReceipt?.vendor || 'Receipt Details'}
      >
        {selectedReceipt && (
          <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full h-64">
                  {selectedReceipt.image_url && (
                    <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-lg object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-neutral-500">Vendor</p>
                    <p className="text-sm font-medium">{selectedReceipt.vendor || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">SI/OR Number</p>
                    <p className="text-sm font-medium">{selectedReceipt.si_or_number || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-neutral-500">Date</p>
                      <p className="text-sm font-medium">{selectedReceipt.date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Time</p>
                      <p className="text-sm font-medium">{selectedReceipt.time || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Category</p>
                    <Badge>{selectedReceipt.category} — {selectedReceipt.confidence || 0}%</Badge>
                  </div>
                  <Separator />
                  {selectedReceipt.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="flex-1">{item.name}</span>
                      <span className="w-12 text-right">{item.qty}</span>
                      <span className="w-20 text-right">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedReceipt.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={selectedReceipt.status as any}>{selectedReceipt.status}</Badge>
                    {selectedReceipt.transaction_hash && (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Blockchain Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
      </ResponsiveDialog>
    </div>
  );
  }

  // ==================== DESKTOP LAYOUT (>= 1024px) ====================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Over-budget banner */}
      {event.budget < 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-600 dark:text-red-400 text-sm font-medium">
            This event exceeds its budget by {formatCurrency(Math.abs(event.budget))}.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} prefetch={true} className="text-text-secondary hover:text-text-primary transition-colors duration-150 shrink-0">
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

      {/* Main two-column layout */}
      <div className="flex flex-row gap-6 items-start">
        {/* LEFT PANEL (70%) */}
        <div className="flex-[7] min-w-0 space-y-5">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            {/* Tab pills */}
            <div className="inline-flex bg-surface-gray p-0.5 rounded-xl">
              <button
                onClick={() => setExpensesTab('expenses')}
                className={cn(
                  'relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300',
                  expensesTab === 'expenses'
                    ? 'bg-surface-white shadow-sm text-text-primary'
                    : 'text-text-secondary hover:text-text-body'
                )}
              >
                {expensesTab === 'expenses' && (
                  <motion.div layoutId="tab-pill-adviser" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ClipboardText className="h-3.5 w-3.5" /> Expenses
                </span>
              </button>
              <button
                onClick={() => setExpensesTab('report')}
                className={cn(
                  'relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300',
                  expensesTab === 'report'
                    ? 'bg-surface-white shadow-sm text-text-primary'
                    : 'text-text-secondary hover:text-text-body'
                )}
              >
                {expensesTab === 'report' && (
                  <motion.div layoutId="tab-pill-adviser" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ChartBar className="h-3.5 w-3.5" /> Report
                </span>
              </button>
            </div>

            <div className="flex-1" />

            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200',
                  showFilterDropdown ? 'bg-surface-gray text-text-primary' : 'text-text-secondary hover:bg-surface-gray hover:text-text-body'
                )}
              >
                <Funnel className="h-4 w-4" />
              </button>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-56 bg-surface-white rounded-2xl shadow-lg border border-divider/40 p-3 z-50"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Type</p>
                      <div className="flex gap-1">
                        {(['all', 'receipt', 'no-receipt'] as const).map(t => (
                          <button key={t} onClick={() => setFilterType(t)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all', filterType === t ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
                            {t === 'all' ? 'All' : t === 'receipt' ? 'Receipt' : 'No Receipt'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Status</p>
                      <div className="flex gap-1 flex-wrap">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                          <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterStatus === s ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Date</p>
                      <div className="flex gap-1">
                        {(['newest', 'oldest'] as const).map(d => (
                          <button key={d} onClick={() => setFilterDate(d)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterDate === d ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
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

          {/* Content */}
          <AnimatePresence mode="wait">
            {expensesTab === 'expenses' ? (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {mergedExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-surface-gray flex items-center justify-center animate-breathe-subtle">
                      <ClipboardText className="h-8 w-8 text-text-placeholder" />
                    </div>
                    <p className="text-[15px] leading-[22px] text-text-secondary font-medium">No expenses yet</p>
                    <p className="text-[13px] leading-[18px] text-text-placeholder -mt-2">Expenses will appear here once they are submitted.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mergedExpenses.map((item, index) => (
                      <motion.div
                        key={`${item._type}-${item.id}`}
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                      >
                        {item._type === 'receipt' ? (
                          /* Receipt card */
                          <button onClick={() => setSelectedReceipt(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-surface-gray overflow-hidden shrink-0 relative">
                                  {item.image_url ? (
                                    <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <ImageIcon className="h-6 w-6 text-text-placeholder" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.vendor || 'Unknown'}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize truncate">{item.category}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.total)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && (
                                    <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </button>
                        ) : (
                          /* No-receipt card */
                          <button onClick={() => setSelectedForm(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                  <FileText className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.expense_name || item.expense_type}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize">{item.expense_type}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.amount)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && (
                                    <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                  )}
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
              <motion.div
                key="report"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20">
                  <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-[15px] font-[590] tracking-[-0.02em] text-text-primary">Category Breakdown</CardTitle>
                      <CardDescription className="text-[11px] text-text-secondary mt-0.5">Approved expenses by category</CardDescription>
                    </div>
                    <Link href={`/adviser/reports/${eventId}`} prefetch={true}>
                      <Button variant="outline" size="sm" className="rounded-xl text-[11px] h-8">
                        <FileText className="h-3.5 w-3.5 mr-1" /> Report
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <CategoryBarChart data={categoryBreakdown} />
                    {categoryBreakdown.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-text-secondary">Total Approved</span>
                          <span className="font-semibold text-text-primary">{formatCurrency(categoryBreakdown.reduce((s, c) => s + c.total, 0))}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDEBAR (30%) — sticky */}
        <div className="flex-[3] hidden lg:block sticky top-24 self-start">
          <div className="space-y-5 animate-slide-in-right">
            {/* Donut + Stats */}
            <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <BudgetChart used={totalExpenses} remaining={event.budget} size={160} />
                  <div className="w-full mt-5 grid grid-cols-3 divide-x divide-divider/60">
                    <div className="text-center pr-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Total</p>
                      <AnimatedCurrency value={totalExpenses + event.budget} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Spent</p>
                      <AnimatedCurrency value={totalExpenses} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center pl-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Remain</p>
                      <AnimatedCurrency value={event.budget} className={cn('text-[14px] font-semibold leading-tight block mt-0.5', event.budget < 0 ? 'text-error' : 'text-text-primary')} />
                    </div>
                  </div>
                  {event.budget < 0 && (
                    <div className="mt-3 w-full px-3 py-1.5 bg-red-50 rounded-xl text-[10px] font-medium text-error text-center">
                      Budget exceeded by {formatCurrency(Math.abs(event.budget))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mini KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-primary-tint-bg flex items-center justify-center">
                        <ReceiptIcon className="h-3 w-3 text-primary" />
                      </div>
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
                      <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-amber-600" />
                      </div>
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

      {/* ==================== SHARED MODALS (desktop) ==================== */}

      {/* Receipt Detail Modal */}
      <ResponsiveDialog
        open={!!selectedReceipt}
        onOpenChange={(open) => !open && setSelectedReceipt(null)}
        title={selectedReceipt?.vendor || 'Receipt Details'}
      >
        {selectedReceipt && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative w-full h-64">
                {selectedReceipt.image_url && (
                  <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-lg object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-neutral-500">Vendor</p>
                  <p className="text-sm font-medium">{selectedReceipt.vendor || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">SI/OR Number</p>
                  <p className="text-sm font-medium">{selectedReceipt.si_or_number || 'N/A'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-neutral-500">Date</p>
                    <p className="text-sm font-medium">{selectedReceipt.date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Time</p>
                    <p className="text-sm font-medium">{selectedReceipt.time || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Category</p>
                  <Badge>{selectedReceipt.category} — {selectedReceipt.confidence || 0}%</Badge>
                </div>
                <Separator />
                {selectedReceipt.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="flex-1">{item.name}</span>
                    <span className="w-12 text-right">{item.qty}</span>
                    <span className="w-20 text-right">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedReceipt.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={selectedReceipt.status as any}>{selectedReceipt.status}</Badge>
                  {selectedReceipt.transaction_hash && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Blockchain Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </ResponsiveDialog>

      {/* Form Detail Modal (with approve/reject) */}
      <ResponsiveDialog
        open={!!selectedForm}
        onOpenChange={(open) => !open && setSelectedForm(null)}
        title={selectedForm?.expense_name || ''}
        description="No-Receipt Form Details"
      >
        {selectedForm && (
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Expense Type</p>
                <p className="font-medium capitalize break-words">{selectedForm.expense_type}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Amount</p>
                <p className="font-medium">{formatCurrency(selectedForm.amount)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Date Incurred</p>
                <p className="font-medium">{formatDate(selectedForm.date_incurred)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Status</p>
                <Badge variant={selectedForm.status as any}>{selectedForm.status}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs text-neutral-500 mb-1">Submitted By</p>
              <p className="text-sm break-words">{selectedForm.profiles?.first_name} {selectedForm.profiles?.last_name}</p>
            </div>

            <div>
              <p className="text-xs text-neutral-500 mb-1">Description</p>
              <p className="text-sm whitespace-pre-wrap break-words">{selectedForm.description}</p>
            </div>

            {selectedForm.formula_breakdown && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Formula Breakdown</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                </div>
              </>
            )}

            {selectedForm.transport_data && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Transport Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Mode</p><p>{selectedForm.transport_data.mode}</p></div>
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Route</p><p>{selectedForm.transport_data.route}</p></div>
                    <div><p className="text-xs text-neutral-400">Fare/Person</p><p>{formatCurrency(selectedForm.transport_data.fare_per_person)}</p></div>
                    <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.transport_data.persons}</p></div>
                    <div><p className="text-xs text-neutral-400">Trips</p><p>{selectedForm.transport_data.trips}</p></div>
                  </div>
                </div>
              </>
            )}

            {selectedForm.food_data && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Food / Meals Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Meal Type</p><p>{selectedForm.food_data.meal_type}</p></div>
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Vendor</p><p>{selectedForm.food_data.vendor}</p></div>
                    <div><p className="text-xs text-neutral-400">Cost/Person</p><p>{formatCurrency(selectedForm.food_data.cost_per_person)}</p></div>
                    <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.food_data.persons}</p></div>
                    <div><p className="text-xs text-neutral-400">Meals</p><p>{selectedForm.food_data.meals}</p></div>
                  </div>
                </div>
              </>
            )}

            {selectedForm.supplies_data?.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Supplies Items</p>
                  <div className="space-y-1 text-sm">
                    {selectedForm.supplies_data.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs border-b border-neutral-100 dark:border-neutral-800 pb-1">
                        <span className="flex-1 min-w-0 break-words">{item.item_name}</span>
                        <span className="w-16 text-right">{item.qty}x</span>
                        <span className="w-20 text-right">{formatCurrency(item.unit_cost)}</span>
                        <span className="w-20 text-right font-medium">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedForm.labor_data && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Labor / Service Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Service Type</p><p>{selectedForm.labor_data.service_type}</p></div>
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Vendor</p><p>{selectedForm.labor_data.vendor_name || selectedForm.labor_data.vendor}</p></div>
                    <div><p className="text-xs text-neutral-400">Rate</p><p>{formatCurrency(selectedForm.labor_data.rate)}</p></div>
                    <div><p className="text-xs text-neutral-400">Persons</p><p>{selectedForm.labor_data.persons}</p></div>
                    <div><p className="text-xs text-neutral-400">Duration</p><p>{selectedForm.labor_data.duration} {selectedForm.labor_data.duration_unit}</p></div>
                  </div>
                </div>
              </>
            )}

            {selectedForm.other_data && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Other Details</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0 break-words"><p className="text-xs text-neutral-400">Item</p><p>{selectedForm.other_data.expense_name}</p></div>
                    <div><p className="text-xs text-neutral-400">Unit Cost</p><p>{formatCurrency(selectedForm.other_data.unit_cost)}</p></div>
                    <div><p className="text-xs text-neutral-400">Quantity</p><p>{selectedForm.other_data.qty}</p></div>
                  </div>
                </div>
              </>
            )}

            {selectedForm.witnesses?.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-neutral-500 mb-2 font-semibold">Witnesses</p>
                  <div className="space-y-1 text-sm">
                    {selectedForm.witnesses.filter((w: any) => !w._marker).map((w: any, i: number) => (
                      <div key={i} className="text-xs">
                        <span className="font-medium">{w.name}</span>
                        {w.role && <span className="text-neutral-500"> — {w.role}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-2">
              <div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-neutral-900 dark:bg-white' : 'border-neutral-300 dark:border-neutral-700')}>
                {selectedForm.certification && <CheckCircle className="h-3 w-3 text-white dark:text-neutral-900" />}
              </div>
              <span className="text-xs text-neutral-500">Certified true and correct</span>
            </div>

            {selectedForm.rejection_reason && (
              <>
                <Separator />
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  <p className="font-medium mb-1">Rejection Reason</p>
                  <p className="whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                </div>
              </>
            )}

            {selectedForm.transaction_hash && (
              <>
                <Separator />
                <Badge variant="success" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Blockchain Verified
                </Badge>
              </>
            )}

            {/* Approve/Reject buttons for pending forms */}
            {selectedForm.status === 'pending' && !selectedForm.rejection_reason && (
              <>
                <Separator />
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleApproveForm(selectedForm.id)}
                    disabled={approvingForm || rejectingForm}
                  >
                    {approvingForm ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {approvingForm ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setSelectedForm(null); setRejectTarget(selectedForm.id); }}
                    disabled={rejectingForm || approvingForm}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </ResponsiveDialog>

      {/* Reject Dialog */}
      <ResponsiveDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}
        title="Reject Form"
        description="Provide a reason for rejection"
      >
        <div className="space-y-4">
          <Label>Rejection Reason</Label>
          <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this form is being rejected..." rows={4} />
          <Button variant="destructive" className="w-full" onClick={() => rejectTarget && handleRejectForm(rejectTarget)} disabled={rejectingForm}>
            {rejectingForm ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : null}
            {rejectingForm ? 'Submitting...' : 'Submit Rejection'}
          </Button>
        </div>
      </ResponsiveDialog>

    </div>
  );
}
