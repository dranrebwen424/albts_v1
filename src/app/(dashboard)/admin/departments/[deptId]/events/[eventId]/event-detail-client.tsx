'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import {
  ArrowLeft, Wallet, Receipt as ReceiptIcon, FileText, Image as ImageIcon,
  Users, Shield, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BudgetChart } from '@/components/shared/budget-chart';

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

  function AnimatedNumber({ value, className }: { value: number; className?: string }) {
    const [animated, setAnimated] = useState(0);
    const animRef = useRef<number | null>(null);

    useEffect(() => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const startTime = performance.now();
      const startVal = 0;
      const duration = 800;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimated(Math.round(startVal + (value - startVal) * eased));
        if (progress < 1) animRef.current = requestAnimationFrame(animate);
      };

      animRef.current = requestAnimationFrame(animate);
      return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    }, [value]);

    return <span className={className}>{animated}</span>;
  }

  if (!event) return <div className="py-8 text-[13px] leading-[18px] text-text-secondary">Event not found.</div>;

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget Overview */}
        <Card className="h-full">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary">Budget Overview</CardTitle>
          </CardHeader>
          <CardContent className="!p-5">
            <div className="flex items-start gap-5">
              <BudgetChart used={totalExpenses} remaining={event.budget} />
              <div className="space-y-2.5 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                  <span className="text-text-secondary text-[13px] leading-[18px]">Expenses</span>
                  <span className="ml-auto font-[590] text-text-primary text-[15px] leading-[22px]">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-divider shrink-0" />
                  <span className="text-text-secondary text-[13px] leading-[18px]">Remaining</span>
                  <span className={cn('ml-auto font-[590] text-[15px] leading-[22px]', event.budget < 0 ? 'text-error' : 'text-text-primary')}>
                    {formatCurrency(event.budget)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts */}
        <Card className="h-full">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary">Receipts</CardTitle>
          </CardHeader>
          <CardContent className="!p-5">
            <AnimatedNumber value={receipts.length} className="block text-[28px] leading-[34px] font-[650] tracking-[-0.03em] text-text-primary mb-4" />
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-primary-tint-bg text-primary-tint-text">{receipts.filter(r => r.status === 'approved').length} Approved</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-amber-50 text-amber-700">{receipts.filter(r => r.status === 'pending').length} Pending</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-red-50 text-error">{receipts.filter(r => r.status === 'rejected').length} Rejected</span>
            </div>
          </CardContent>
        </Card>

        {/* No-Receipt Forms */}
        <Card className="h-full">
          <CardHeader className="pb-1 px-5 pt-5">
            <CardTitle className="text-[13px] leading-[18px] font-medium text-text-secondary">No-Receipt Forms</CardTitle>
          </CardHeader>
          <CardContent className="!p-5">
            <AnimatedNumber value={forms.length} className="block text-[28px] leading-[34px] font-[650] tracking-[-0.03em] text-text-primary mb-4" />
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-primary-tint-bg text-primary-tint-text">{forms.filter(f => f.status === 'approved').length} Approved</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-amber-50 text-amber-700">{forms.filter(f => f.status === 'pending').length} Pending</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] leading-[16px] font-medium bg-red-50 text-error">{forms.filter(f => f.status === 'rejected').length} Rejected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="receipts">
        <TabsList className="bg-surface-gray p-1 rounded-lg">
          <TabsTrigger value="receipts" className="data-[state=active]:bg-surface-white data-[state=active]:shadow-sm">Receipts</TabsTrigger>
          <TabsTrigger value="forms" className="data-[state=active]:bg-surface-white data-[state=active]:shadow-sm">No-Receipt Forms</TabsTrigger>
        </TabsList>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <motion.div
            key="receipts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          {receipts.length === 0 ? (
            <Card className="bg-surface-white rounded-xl shadow-sm">
              <CardContent className="text-center py-8 text-[13px] leading-[18px] text-text-secondary">No receipts uploaded yet</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {receipts.map((receipt) => (
                <button key={receipt.id} onClick={() => setSelectedReceipt(receipt)} className="text-left">
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-surface-white rounded-xl shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-surface-gray overflow-hidden flex-shrink-0 relative">
                          {receipt.image_url ? (
                            <Image src={receipt.image_url} alt="" fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-text-placeholder" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] leading-[22px] font-medium truncate">{receipt.vendor || 'Unknown Vendor'}</p>
                          <p className="text-[11px] leading-[14px] text-text-secondary break-words">{receipt.category}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[15px] leading-[22px] font-semibold">{formatCurrency(receipt.total)}</span>
                            <Badge variant={receipt.status as any} className="text-[11px] leading-[14px] px-1.5 py-0">{receipt.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
          </motion.div>
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <motion.div
            key="forms"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          {forms.length === 0 ? (
            <Card className="bg-surface-white rounded-xl shadow-sm">
              <CardContent className="text-center py-8 text-[13px] leading-[18px] text-text-secondary">No no-receipt forms submitted yet</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {forms.map((form) => (
                <button key={form.id} onClick={() => setSelectedForm(form)} className="text-left">
                  <Card className="hover:shadow-md transition-all cursor-pointer bg-surface-white rounded-xl shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] leading-[22px] font-medium truncate">{form.expense_name || form.expense_type}</p>
                          <p className="text-[11px] leading-[14px] text-text-secondary capitalize">{form.expense_type}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[15px] leading-[22px] font-semibold">{formatCurrency(form.amount || 0)}</span>
                            <Badge variant={form.status as any} className="text-[11px] leading-[14px] px-1.5 py-0">{form.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Footer Links */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/departments/${deptId}/reports/${eventId}`} prefetch={true}>
          <Button variant="outline" size="sm">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> View Financial Report
          </Button>
        </Link>
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
                  <Image src={selectedReceipt.image_url} alt="Receipt" fill className="rounded-lg border object-cover" sizes="100vw" />
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
