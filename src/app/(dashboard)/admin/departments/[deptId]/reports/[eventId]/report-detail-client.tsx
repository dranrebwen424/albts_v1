'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils/format';
import {
  ArrowLeft, FileText, Wallet, Receipt, PieChart, Shield, Clock,
} from 'lucide-react';

export function AdminReportDetailClient({
  deptId,
  eventId,
  data,
}: {
  deptId: string;
  eventId: string;
  data: any;
}) {
  if (!data) {
    return (
      <div className="space-y-6">
        <Link href={`/admin/departments/${deptId}/reports`} prefetch={true} className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
        <p className="text-sm text-neutral-500">Failed to load report data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/departments/${deptId}/reports`} prefetch={true}>
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
            data.fsRecord.status === 'approved'
              ? <Badge variant="success">Approved by Adviser</Badge>
              : <Badge variant="secondary">Pending Adviser Approval</Badge>
          )}
          <Link href={`/admin/departments/${deptId}/events/${eventId}`} prefetch={true}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
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

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.categoryBreakdown).length === 0 ? (
            <p className="text-sm text-neutral-500">No expenses recorded.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.categoryBreakdown).map(([category, amount]: [string, any]) => (
                <div key={category} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="capitalize">{category}</span>
                  <span className="font-medium">{formatCurrency(amount as number)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold pt-2">
                <span>Total</span>
                <span>{formatCurrency(data.totalExpenses)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Receipts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved Receipts ({data.approvedReceipts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedReceipts.length === 0 ? (
            <p className="text-sm text-neutral-500">No approved receipts.</p>
          ) : (
            <div className="space-y-2">
              {data.approvedReceipts.map((receipt: any) => (
                <div key={receipt.id} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div>
                    <p className="font-medium">{receipt.vendor || 'Unknown'}</p>
                    <p className="text-xs text-neutral-500">{receipt.category}</p>
                  </div>
                  <span className="font-medium">{formatCurrency(receipt.total || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved No-Receipt Forms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved No-Receipt Forms ({data.approvedForms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.approvedForms.length === 0 ? (
            <p className="text-sm text-neutral-500">No approved no-receipt forms.</p>
          ) : (
            <div className="space-y-2">
              {data.approvedForms.map((form: any) => (
                <div key={form.id} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <div>
                    <p className="font-medium">{form.expense_name || form.expense_type}</p>
                    <p className="text-xs text-neutral-500 capitalize">{form.expense_type}</p>
                  </div>
                  <span className="font-medium">{formatCurrency(form.amount || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
