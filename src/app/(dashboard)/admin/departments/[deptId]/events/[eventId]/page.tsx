'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEvent, getReceipts, getNoReceiptForms } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import {
  ArrowLeft, Wallet, Receipt as ReceiptIcon, FileText, Image as ImageIcon,
  Users, Shield, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0a0a0a', '#e5e5e5', '#22c55e'];

export default function AdminEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deptId = params.deptId as string;
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [eventData, receiptsData, formsData] = await Promise.all([
        getEvent(eventId),
        getReceipts(eventId),
        getNoReceiptForms(eventId),
      ]);
      setEvent(eventData);
      setReceipts(receiptsData);
      setForms(formsData);
      setLoading(false);
    };
    init();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!event) return <div className="py-8 text-sm text-neutral-500">Event not found.</div>;

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0);

  const budgetData = [
    { name: 'Used', value: totalExpenses },
    { name: 'Remaining', value: event.budget },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/departments/${deptId}/events`} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Budget: {formatCurrency(event.budget + totalExpenses)} | Used: {formatCurrency(totalExpenses)} | Remaining: <span className={event.budget < 0 ? 'text-red-500 font-semibold' : ''}>{formatCurrency(event.budget)}</span>
          </p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-24 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={budgetData} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" strokeWidth={0}>
                      {budgetData.map((_, idx) => <Cell key={idx} fill={COLORS[idx]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />
                  <span>Expenses: {formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  <span>Remaining: <span className={event.budget < 0 ? 'text-red-500 font-semibold' : ''}>{formatCurrency(event.budget)}</span></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-2">{receipts.length}</div>
            <div className="flex gap-2 text-xs">
              <Badge variant="approved">{receipts.filter(r => r.status === 'approved').length} Approved</Badge>
              <Badge variant="pending">{receipts.filter(r => r.status === 'pending').length} Pending</Badge>
              <Badge variant="rejected">{receipts.filter(r => r.status === 'rejected').length} Rejected</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No-Receipt Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-2">{forms.length}</div>
            <div className="flex gap-2 text-xs">
              <Badge variant="approved">{forms.filter(f => f.status === 'approved').length} Approved</Badge>
              <Badge variant="pending">{forms.filter(f => f.status === 'pending').length} Pending</Badge>
              <Badge variant="rejected">{forms.filter(f => f.status === 'rejected').length} Rejected</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="forms">No-Receipt Forms</TabsTrigger>
        </TabsList>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          {receipts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-sm text-neutral-500">No receipts uploaded yet</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {receipts.map((receipt) => (
                <button key={receipt.id} onClick={() => setSelectedReceipt(receipt)} className="text-left">
                  <Card className="hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0 relative">
                          {receipt.image_url ? (
                            <Image src={receipt.image_url} alt="" fill className="object-cover" sizes="48px" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{receipt.vendor || 'Unknown Vendor'}</p>
                          <p className="text-xs text-neutral-500 break-words">{receipt.category}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold">{formatCurrency(receipt.total)}</span>
                            <Badge variant={receipt.status as any} className="text-[10px] px-1.5 py-0">{receipt.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          {forms.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-sm text-neutral-500">No no-receipt forms submitted yet</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {forms.map((form) => (
                <button key={form.id} onClick={() => setSelectedForm(form)} className="text-left">
                  <Card className="hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{form.expense_name || form.expense_type}</p>
                          <p className="text-xs text-neutral-500 capitalize">{form.expense_type}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold">{formatCurrency(form.amount || 0)}</span>
                            <Badge variant={form.status as any} className="text-[10px] px-1.5 py-0">{form.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer Links */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/departments/${deptId}/reports/${eventId}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> View Financial Report
          </Button>
        </Link>
      </div>

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => { if (!open) setSelectedReceipt(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedReceipt?.vendor || 'Receipt'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedReceipt && (
              <div className="space-y-4">
                {selectedReceipt.image_url && (
                  <div className="relative w-full h-64">
                    <Image src={selectedReceipt.image_url} alt="Receipt" fill className="rounded-lg border object-cover" sizes="100vw" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-neutral-500">SI/OR Number</p>
                    <p className="font-medium">{selectedReceipt.si_or_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Category</p>
                    <p className="font-medium">{selectedReceipt.category || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Date</p>
                    <p className="font-medium">{selectedReceipt.date || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Total</p>
                    <p className="font-medium">{formatCurrency(selectedReceipt.total || 0)}</p>
                  </div>
                </div>
                {selectedReceipt.items?.length > 0 && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Items</p>
                    <div className="space-y-1">
                      {selectedReceipt.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs bg-neutral-50 dark:bg-neutral-900 p-2 rounded">
                          <span>{item.name}</span>
                          <span>{item.qty} x {formatCurrency(item.unit_price)} = {formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-500">
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
        </DialogContent>
      </Dialog>

      {/* Form Detail Modal */}
      <Dialog open={!!selectedForm} onOpenChange={(open) => { if (!open) setSelectedForm(null); }}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>{selectedForm?.expense_name || 'No-Receipt Form'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[80vh] pr-4">
            {selectedForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-neutral-500">Expense Type</p>
                    <p className="font-medium capitalize">{selectedForm.expense_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedForm.amount || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-neutral-500">Description</p>
                    <p className="font-medium whitespace-pre-wrap break-words">{selectedForm.description || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Date Incurred</p>
                    <p className="font-medium">{selectedForm.date_incurred || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Status</p>
                    <Badge variant={selectedForm.status as any}>{selectedForm.status}</Badge>
                  </div>
                </div>
                {selectedForm.formula_breakdown && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Formula Breakdown</p>
                    <p className="text-xs bg-neutral-50 dark:bg-neutral-900 p-2 rounded whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                  </div>
                )}
                {selectedForm.rejection_reason && (
                  <div>
                    <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                    <p className="text-xs bg-red-50 dark:bg-red-950 p-2 rounded whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-neutral-500">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
