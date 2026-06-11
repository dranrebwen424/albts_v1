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
import {
  ArrowLeft, FileText, CheckCircle, Loader2,
  Wallet, Receipt, PieChart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

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
        <p className="text-sm text-neutral-500">Failed to load report data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/adviser/reports" prefetch={true}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.event.name}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
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
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Event
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-xs text-neutral-500">Original Budget</p>
              <p className="text-lg font-bold">{formatCurrency(data.event.budget + data.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-neutral-500">Total Expenses</p>
              <p className="text-lg font-bold">{formatCurrency(data.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <PieChart className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-xs text-neutral-500">Remaining Budget</p>
              <p className="text-lg font-bold">{formatCurrency(data.remainingBudget)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.categoryBreakdown).length === 0 ? (
            <p className="text-sm text-neutral-500">No approved expenses yet.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-neutral-500 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span>Category</span>
                <span>Amount</span>
              </div>
              {Object.entries(data.categoryBreakdown).map(([cat, amount]) => (
                <div key={cat} className="flex justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="capitalize">{cat}</span>
                  <span className="font-medium">{formatCurrency(amount as number)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-300 dark:border-neutral-600">
                <span>Total</span>
                <span>{formatCurrency(data.totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedReceipts.length === 0 ? (
            <p className="text-sm text-neutral-500">No approved receipts.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-neutral-500 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="flex-1">Vendor</span>
                <span className="w-24 text-right">Category</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedReceipts.map((r: any) => (
                <div key={r.id} className="flex justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="flex-1">{r.vendor || 'N/A'}</span>
                  <span className="w-24 text-right capitalize text-neutral-500">{r.category || 'N/A'}</span>
                  <span className="w-24 text-right font-medium">{formatCurrency(r.total || 0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-300 dark:border-neutral-600">
                <span className="flex-1">Total from Receipts</span>
                <span className="w-24 text-right" />
                <span className="w-24 text-right">{formatCurrency(data.totalReceiptExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved No-Receipt Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedForms.length === 0 ? (
            <p className="text-sm text-neutral-500">No approved no-receipt forms.</p>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium text-neutral-500 pb-2 border-b border-neutral-200 dark:border-neutral-700">
                <span className="flex-1">Expense Name</span>
                <span className="w-24 text-right">Type</span>
                <span className="w-24 text-right">Amount</span>
              </div>
              {data.approvedForms.map((f: any) => (
                <div key={f.id} className="flex justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="flex-1">{f.expense_name}</span>
                  <span className="w-24 text-right capitalize text-neutral-500">{f.expense_type}</span>
                  <span className="w-24 text-right font-medium">{formatCurrency(f.amount || 0)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-neutral-300 dark:border-neutral-600">
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
          <Button size="lg" onClick={handleApprove} disabled={approving}>
            {approving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
          <p className="text-sm text-neutral-500">No Financial Statement has been generated yet. The officer needs to generate it first.</p>
        )}
      </div>
    </div>
  );
}
