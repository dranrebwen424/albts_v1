'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useEventsStore } from '@/stores/events';
import { getEvent, getReceipts, getNoReceiptForms, approveNoReceiptForm, rejectNoReceiptForm, approveFinancialReport, getFinancialReport } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Receipt as ReceiptIcon, FileText, CheckCircle, XCircle, Shield, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0a0a0a', '#e5e5e5', '#22c55e'];

export default function AdviserEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const [eventId, setEventId] = useState('');
  const [event, setEvent] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(s => s.profile);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [approvingForm, setApprovingForm] = useState(false);
  const [rejectingForm, setRejectingForm] = useState(false);
  const [approvingReport, setApprovingReport] = useState(false);

  useEffect(() => {
    const init = async () => {
      const p = await params;
      setEventId(p.eventId);

      const cached = useEventsStore.getState().eventDetailCache[p.eventId];
      if (cached) {
        setEvent(cached.event);
        setReceipts(cached.receipts);
        setForms(cached.forms);
        setReport(cached.report);
        setLoading(false);
      }

      const [eventData, receiptsData, formsData, report] = await Promise.all([
        getEvent(p.eventId),
        getReceipts(p.eventId),
        getNoReceiptForms(p.eventId),
        getFinancialReport(p.eventId).catch(() => null),
      ]);

      setEvent(eventData);
      setReceipts(receiptsData);
      setForms(formsData);
      setReport(report);

      if (!cached) setLoading(false);
    };
    init();
  }, [params]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!event) return <div>Event not found</div>;

  const totalExpenses = [...receipts.filter(r => r.status === 'approved'), ...forms.filter(f => f.status === 'approved')]
    .reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0);

  const budgetData = [
    { name: 'Used', value: totalExpenses },
    { name: 'Remaining', value: event.budget },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/adviser/events" prefetch={true} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <p className="text-sm text-neutral-500">Budget: {formatCurrency(event.budget + totalExpenses)} | Used: {formatCurrency(totalExpenses)}</p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'}>
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      {/* Over-budget banner */}
      {event.budget < 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-600 dark:text-red-400 text-sm font-medium">
            This event exceeds its budget by {formatCurrency(Math.abs(event.budget))}.
          </span>
        </div>
      )}

      {/* KPI Dashboard */}
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
                            {approvingForm ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                            {approvingForm ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setRejectTarget(form.id)} disabled={rejectingForm || approvingForm}>
                            {rejectingForm ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
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
        </TabsContent>

        <TabsContent value="receipts" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            {approvingReport ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
            {approvingReport ? 'Approving...' : 'Approve Financial Statement'}
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Form</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this form is being rejected..." rows={4} />
            <Button variant="destructive" className="w-full" onClick={() => rejectTarget && handleRejectForm(rejectTarget)} disabled={rejectingForm}>
              {rejectingForm ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {rejectingForm ? 'Submitting...' : 'Submit Rejection'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Detail Modal */}
      <Dialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[95vh] overflow-y-auto">
          {selectedForm && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedForm.expense_name}</DialogTitle>
                <DialogDescription>No-Receipt Form Details</DialogDescription>
              </DialogHeader>
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

                {/* Type-specific data */}
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

                {/* Witnesses */}
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

                {/* Certification */}
                <Separator />
                <div className="flex items-center gap-2">
                  <div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-neutral-900 dark:bg-white' : 'border-neutral-300 dark:border-neutral-700')}>
                    {selectedForm.certification && <CheckCircle className="h-3 w-3 text-white dark:text-neutral-900" />}
                  </div>
                  <span className="text-xs text-neutral-500">Certified true and correct</span>
                </div>

                {/* Rejection */}
                {selectedForm.rejection_reason && (
                  <>
                    <Separator />
                    <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="font-medium mb-1">Rejection Reason</p>
                      <p className="whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                    </div>
                  </>
                )}

                {/* Blockchain */}
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
        </DialogContent>
      </Dialog>

      {/* Receipt Detail Modal */}
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-2xl">
          {selectedReceipt && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReceipt.vendor || 'Receipt Details'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full h-64">
                  {selectedReceipt.image_url && (
                    <Image src={selectedReceipt.image_url} alt="Receipt" fill className="rounded-lg object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
