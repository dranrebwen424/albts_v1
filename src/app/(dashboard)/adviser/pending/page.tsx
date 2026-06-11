'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { getPendingForms, approveNoReceiptForm, rejectNoReceiptForm } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { CheckCircle, XCircle, ClipboardList, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function PendingApprovalsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [approvingFormId, setApprovingFormId] = useState<string | null>(null);
  const [rejectingFormId, setRejectingFormId] = useState<string | null>(null);
  const profile = useAuthStore(s => s.profile);

  const loadForms = async () => {
    if (!profile) return;
    const data = await getPendingForms(profile.department_id);
    setForms(data);
    setLoading(false);
  };

  useEffect(() => { loadForms(); }, [profile]);

  // Background polling to sync with event detail page changes — pause when hidden
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadForms();
    }, 30000);
    return () => clearInterval(interval);
  }, [profile]);

  const handleApprove = async (formId: string, eventId: string) => {
    if (approvingFormId || rejectingFormId) return;
    setApprovingFormId(formId);
    try {
      await approveNoReceiptForm(formId, eventId);
      toast.success('Form approved');
      loadForms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setApprovingFormId(null);
    }
  };

  const handleReject = async (formId: string, eventId: string) => {
    if (rejectingFormId || approvingFormId) return;
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setRejectingFormId(formId);
    try {
      await rejectNoReceiptForm(formId, eventId, rejectReason);
      toast.success('Form rejected');
      setRejectTarget(null);
      setRejectReason('');
      loadForms();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRejectingFormId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pending Approvals</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {forms.length} form{forms.length !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No pending approvals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {forms.map((form: any) => (
            <div key={form.id} onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
              <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{form.expense_name}</span>
                        <Badge>{form.expense_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                        <span>By: {form.profiles?.first_name} {form.profiles?.last_name}</span>
                        <span>Event: {form.events?.name}</span>
                        <span>{formatDate(form.created_at)}</span>
                      </div>
                      <p className="text-sm font-semibold mt-2">{formatCurrency(form.amount)}</p>
                      {form.description && (
                        <p className="text-xs text-neutral-500 mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                      )}
                      {form.formula_breakdown && (
                        <p className="text-xs text-neutral-400 mt-1 break-words">{form.formula_breakdown}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" onClick={() => handleApprove(form.id, form.event_id)} disabled={approvingFormId === form.id || rejectingFormId === form.id}>
                        {approvingFormId === form.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        {approvingFormId === form.id ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectTarget(form.id)} disabled={rejectingFormId === form.id || approvingFormId === form.id}>
                        {rejectingFormId === form.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Form</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why..." rows={4} />
            <Button variant="destructive" className="w-full" disabled={rejectingFormId !== null} onClick={() => {
              const form = forms.find(f => f.id === rejectTarget);
              if (form) handleReject(rejectTarget!, form.event_id);
            }}>
              {rejectingFormId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {rejectingFormId ? 'Submitting...' : 'Submit Rejection'}
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
                  <p className="text-xs text-neutral-500 mb-1">Event</p>
                  <p className="text-sm break-words">{selectedForm.events?.name}</p>
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
    </div>
  );
}
