'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getFsDetailData, approveFinancialReport } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, FileText, CheckCircle, Spinner, Wallet, Receipt, ChartPieSlice,
} from '@phosphor-icons/react';
import { formatCurrency } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

export default function AdviserReportDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(s => s.profile);
  const [data, setData] = useState<any>(null);
  const [approving, setApproving] = useState(false);

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

  const handleApprove = async () => {
    if (!data?.fsRecord) return;
    setApproving(true);
    try {
      await approveFinancialReport(data.fsRecord.id, eventId);
      toast.success('Financial Statement approved');
      await loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setApproving(false);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/adviser/reports" prefetch={true}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">{data.event.name}</h1>
            <p className="page-description">
              {data.departmentName} — {data.event.status === 'done' ? 'Completed' : 'Ongoing'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.fsRecord && (
            <Badge variant={data.fsRecord.status === 'approved' ? 'success' : 'secondary'}>
              {data.fsRecord.status === 'approved' ? 'Approved' : 'Pending Approval'}
            </Badge>
          )}
          <Link href={`/adviser/events/${eventId}`} prefetch={true}>
            <Button variant="outline" size="sm" className="rounded-lg">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Event
            </Button>
          </Link>
        </div>
      </div>

      <motion.div {...staggerContainer()} viewport={{ once: true }} whileInView="animate" className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <motion.div {...fadeSlideUp(0)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary-tint-bg border border-primary-tint-border flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] leading-[14px] text-text-secondary font-medium uppercase tracking-wider">Original Budget</p>
                <p className="text-[17px] leading-6 font-[590] text-text-primary mt-0.5">{formatCurrency(data.event.original_budget)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeSlideUp(1)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] leading-[14px] text-text-secondary font-medium uppercase tracking-wider">Total Expenses</p>
                <p className="text-[17px] leading-6 font-[590] text-text-primary mt-0.5">{formatCurrency(data.totalExpenses)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div {...fadeSlideUp(2)}>
          <Card className="bg-surface-white shadow-soft rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-xl bg-primary-tint-bg border border-primary-tint-border flex items-center justify-center">
                <ChartPieSlice className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[11px] leading-[14px] text-text-secondary font-medium uppercase tracking-wider">Remaining Budget</p>
                <p className="text-[17px] leading-6 font-[590] text-text-primary mt-0.5">{formatCurrency(data.remainingBudget)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <Card className="bg-surface-white shadow-soft rounded-xl">
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.categoryBreakdown).length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved expenses yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] font-medium text-text-secondary pb-2 border-b border-divider">
                <span>Category</span>
                <span>Amount</span>
              </div>
              {Object.entries(data.categoryBreakdown).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between text-[15px] leading-[22px] py-1.5 border-b border-divider last:border-0">
                  <span className="capitalize">{cat}</span>
                  <span className="font-medium">{formatCurrency(amount as number)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[15px] leading-[22px] font-bold pt-2 border-t border-divider">
                <span>Total</span>
                <span>{formatCurrency(data.totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-white shadow-soft rounded-xl">
        <CardHeader>
          <CardTitle>Approved Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedReceipts.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved receipts.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] font-medium text-text-secondary pb-2 border-b border-divider">
                <span className="flex-1">Vendor</span>
                <span className="w-24 text-right">Category</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedReceipts.map((r: any) => (
                <div key={r.id} className="flex justify-between text-[15px] leading-[22px] py-1.5 border-b border-divider last:border-0">
                  <span className="flex-1">{r.vendor || 'N/A'}</span>
                  <span className="w-24 text-right capitalize text-text-secondary">{r.category || 'N/A'}</span>
                  <span className="w-24 text-right font-medium">{formatCurrency(r.total || 0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[15px] leading-[22px] font-bold pt-2 border-t border-divider">
                <span className="flex-1">Total from Receipts</span>
                <span className="w-24 text-right" />
                <span className="w-24 text-right">{formatCurrency(data.totalReceiptExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-surface-white shadow-soft rounded-xl">
        <CardHeader>
          <CardTitle>Approved No-Receipt Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedForms.length === 0 ? (
            <p className="text-[13px] leading-[18px] text-text-secondary">No approved no-receipt forms.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] leading-[14px] font-medium text-text-secondary pb-2 border-b border-divider">
                <span className="flex-1">Expense Name</span>
                <span className="w-24 text-right">Type</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedForms.map((f: any) => (
                <div key={f.id} className="flex justify-between text-[15px] leading-[22px] py-1.5 border-b border-divider last:border-0">
                  <span className="flex-1">{f.expense_name}</span>
                  <span className="w-24 text-right capitalize text-text-secondary">{f.expense_type}</span>
                  <span className="w-24 text-right font-medium">{formatCurrency(f.amount || 0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[15px] leading-[22px] font-bold pt-2 border-t border-divider">
                <span className="flex-1">Total from Forms</span>
                <span className="w-24 text-right" />
                <span className="w-24 text-right">{formatCurrency(data.totalFormExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center gap-3">
        {data.fsRecord && data.fsRecord.status === 'pending' && (
          <Button size="lg" onClick={handleApprove} disabled={approving} className="bg-primary text-white hover:bg-primary-hover rounded-xl">
            {approving ? (
              <Spinner className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {approving ? 'Approving...' : 'Approve Financial Statement'}
          </Button>
        )}
        {data.fsRecord && data.fsRecord.status === 'approved' && (
          <Badge variant="success" className="text-sm px-4 py-2">
            <CheckCircle className="h-4 w-4 mr-2" /> Financial Statement Approved
          </Badge>
        )}
        {!data.fsRecord && (
          <p className="text-[13px] leading-[18px] text-text-secondary">No Financial Statement has been generated yet. The officer needs to generate it first.</p>
        )}
      </div>
    </div>
  );
}
