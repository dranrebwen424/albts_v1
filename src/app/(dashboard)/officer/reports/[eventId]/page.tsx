'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getFsDetailData, generateFinancialReport, markEventDone } from '@/lib/actions';
import { generateFinancialReport as downloadPdf } from '@/lib/pdf/generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, FileText, Download, CheckCircle, AlertCircle, Loader2,
  Wallet, Receipt, PieChart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function OfficerReportDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(s => s.profile);
  const [data, setData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await getFsDetailData(eventId);
      setData(result);
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [eventId]);

  useEffect(() => {
    if (!profile) return;
    const cached = useEventsStore.getState().fsDetailCache[eventId];
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    loadData().finally(() => { if (!cached) setLoading(false); });
  }, [profile, loadData, eventId]);

  const handleGenerateAndDownload = async () => {
    if (!data || !profile) return;
    setGenerating(true);
    try {
      await generateFinancialReport(eventId, data.event.department_id);

      const items = [
        ...data.approvedReceipts.map((r: any) => ({
          category: r.category || 'Uncategorized',
          vendor: r.vendor || 'Receipt',
          amount: r.total || 0,
          date: r.date || '',
          type: 'receipt',
        })),
        ...data.approvedForms.map((f: any) => ({
          category: f.expense_type || 'Other',
          vendor: f.expense_name || f.expense_type,
          amount: f.amount || 0,
          date: f.date_incurred || '',
          type: 'no_receipt',
        })),
      ];

      const blob = await downloadPdf({
        eventName: data.event.name,
        departmentName: data.departmentName,
        items,
        totalBudget: data.event.budget + data.totalExpenses,
        totalExpenses: data.totalExpenses,
        remainingBudget: data.remainingBudget,
        preparedBy: `${profile.first_name} ${profile.last_name}`,
        categoryBreakdown: data.categoryBreakdown,
      });

      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `financial-statement-${data.event.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Financial Statement generated and downloaded');
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setGenerating(false);
  };

  const handleMarkDone = async () => {
    if (!data) return;
    setMarkingDone(true);
    try {
      await markEventDone(eventId, data.event.department_id);
      toast.success('Event marked as done');
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setMarkingDone(false);
  };

  const getFsBadge = () => {
    if (!data?.fsRecord) return null;
    return data.fsRecord.status === 'approved'
      ? <Badge variant="success">Approved by Adviser</Badge>
      : <Badge variant="secondary">Pending Adviser Approval</Badge>;
  };

  const getDisableReason = () => {
    if (!data) return '';
    if (data.formCount === 0) return 'No no-receipt forms for this event';
    if (data.pendingFormCount > 0) return `${data.pendingFormCount} no-receipt form(s) still pending approval`;
    return '';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <p className="text-[13px] leading-[18px] text-text-secondary">Failed to load report data.</p>
      </div>
    );
  }

  const disableReason = getDisableReason();
  const canGenerate = data.canGenerateFs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/officer/reports" prefetch={true}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em] text-text-primary">{data.event.name}</h1>
            <p className="text-[13px] leading-[18px] text-text-secondary mt-1">
              {data.departmentName} — {data.event.status === 'done' ? 'Completed' : 'Ongoing'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getFsBadge()}
          <Link href={`/officer/events/${eventId}`} prefetch={true}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Event
            </Button>
          </Link>
        </div>
      </div>

      <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div {...fadeSlideUp(0)} key="budget">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary-tint-bg text-primary-tint-text">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] leading-[14px] tracking-[0.01em] text-text-secondary">Original Budget</p>
              <p className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">{formatCurrency(data.event.budget + data.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div {...fadeSlideUp(1)} key="expenses">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Receipt className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] leading-[14px] tracking-[0.01em] text-text-secondary">Total Expenses</p>
              <p className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">{formatCurrency(data.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div {...fadeSlideUp(2)} key="remaining">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary-tint-bg text-primary-tint-text">
              <PieChart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] leading-[14px] tracking-[0.01em] text-text-secondary">Remaining Budget</p>
              <p className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">{formatCurrency(data.remainingBudget)}</p>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.categoryBreakdown).length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved expenses yet.</p>
          ) : (
            <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] tracking-[0.01em] font-[590] text-text-secondary pb-2 border-b border-divider">
                <span>Category</span>
                <span>Amount</span>
              </div>
              {Object.entries(data.categoryBreakdown).map(([cat, amount], index) => (
                <motion.div {...fadeSlideUp(index)} key={cat} className="flex justify-between text-[13px] leading-[18px] py-1.5 border-b border-divider last:border-0">
                  <span className="capitalize">{cat}</span>
                  <span className="font-[590]">{formatCurrency(amount as number)}</span>
                </motion.div>
              ))}
              <div className="flex justify-between text-[13px] leading-[18px] font-[590] pt-2 border-t border-divider">
                <span>Total</span>
                <span>{formatCurrency(data.totalExpenses)}</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedReceipts.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved receipts.</p>
          ) : (
            <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] tracking-[0.01em] font-[590] text-text-secondary pb-2 border-b border-divider">
                <span className="flex-1">Vendor</span>
                <span className="w-24 text-right">Category</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedReceipts.map((r: any, index: number) => (
                <motion.div {...fadeSlideUp(index)} key={r.id} className="flex justify-between text-[13px] leading-[18px] py-1.5 border-b border-divider last:border-0">
                  <span className="flex-1">{r.vendor || 'N/A'}</span>
                  <span className="w-24 text-right capitalize text-text-secondary">{r.category || 'N/A'}</span>
                  <span className="w-24 text-right font-[590]">{formatCurrency(r.total || 0)}</span>
                </motion.div>
              ))}
              <div className="flex justify-between text-[13px] leading-[18px] font-[590] pt-2 border-t border-divider">
                <span className="flex-1">Total from Receipts</span>
                <span className="w-24 text-right" />
                <span className="w-24 text-right">{formatCurrency(data.totalReceiptExpenses)}</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approved No-Receipt Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedForms.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved no-receipt forms.</p>
          ) : (
            <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] tracking-[0.01em] font-[590] text-text-secondary pb-2 border-b border-divider">
                <span className="flex-1">Expense Name</span>
                <span className="w-24 text-right">Type</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedForms.map((f: any, index: number) => (
                <motion.div {...fadeSlideUp(index)} key={f.id} className="flex justify-between text-[13px] leading-[18px] py-1.5 border-b border-divider last:border-0">
                  <span className="flex-1">{f.expense_name}</span>
                  <span className="w-24 text-right capitalize text-text-secondary">{f.expense_type}</span>
                  <span className="w-24 text-right font-[590]">{formatCurrency(f.amount || 0)}</span>
                </motion.div>
              ))}
              <div className="flex justify-between text-[13px] leading-[18px] font-[590] pt-2 border-t border-divider">
                <span className="flex-1">Total from Forms</span>
                <span className="w-24 text-right" />
                <span className="w-24 text-right">{formatCurrency(data.totalFormExpenses)}</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-3">
        <Button
          size="lg"
          onClick={handleGenerateAndDownload}
          disabled={!canGenerate || generating || data.event.status === 'done'}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {generating ? 'Generating...' : 'Generate & Download PDF FS'}
        </Button>
        {disableReason && (
          <p className="text-[11px] leading-[14px] tracking-[0.01em] text-amber-700 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {disableReason}
          </p>
        )}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="lg"
          onClick={handleMarkDone}
          disabled={!data.fsRecord || markingDone || data.event.status === 'done'}
        >
          {markingDone ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          {markingDone ? 'Marking...' : data.event.status === 'done' ? 'Completed' : 'Mark as Done'}
        </Button>
        {!data.fsRecord && data.event.status !== 'done' && (
          <p className="text-[11px] leading-[14px] tracking-[0.01em] text-amber-700 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Generate the FS first
          </p>
        )}
      </div>
    </div>
  );
}
