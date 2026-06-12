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
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { CheckCircle, XCircle, ClipboardList, ArrowRight, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { fadeSlideUp, staggerContainer } from '@/components/shared/page-transition';

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
        {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] leading-[30px] font-[650] tracking-[-0.04em]">Pending Approvals</h1>
        <p className="text-[13px] leading-[18px] text-text-secondary mt-1">
          {forms.length} form{forms.length !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {forms.length === 0 ? (
        <Card className="hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="h-12 w-12 text-text-secondary mb-4" />
            <p className="text-[13px] leading-[18px] text-text-secondary">No pending approvals</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div {...staggerContainer()} viewport={{ once: true, margin: '-30px' }} whileInView="animate" className="space-y-3">
          {forms.map((form: any, index) => (
            <motion.div {...fadeSlideUp(index)} key={form.id} onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
              <Card className="border-0 border-l-4 border-l-amber-500 hover:shadow-md transition-all duration-300 ease-out cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] leading-[22px] font-medium">{form.expense_name}</span>
                        <Badge>{form.expense_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[13px] leading-[18px] text-text-secondary mt-1">
                        <span>By: {form.profiles?.first_name} {form.profiles?.last_name}</span>
                        <span>Event: {form.events?.name}</span>
                        <span>{formatDate(form.created_at)}</span>
                      </div>
                      <p className="text-[15px] leading-[22px] font-semibold mt-2">{formatCurrency(form.amount)}</p>
                      {form.description && (
                        <p className="text-[13px] leading-[18px] text-text-secondary mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                      )}
                      {form.formula_breakdown && (
                        <p className="text-[11px] leading-[14px] text-text-secondary mt-1 break-words">{form.formula_breakdown}</p>
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
            </motion.div>
          ))}
        </motion.div>
      )}

      <ResponsiveDialog
        open={!!rejectTarget}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}
        title="Reject Form"
        description="Provide a reason for rejection"
      >
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
      </ResponsiveDialog>

      {/* Form Detail Modal */}
      <ResponsiveDialog
        open={!!selectedForm}
        onOpenChange={(open) => !open && setSelectedForm(null)}
        title={selectedForm?.expense_name || ''}
        description="No-Receipt Form Details"
      >
        {selectedForm && (
          <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Expense Type</p>
                    <p className="text-[15px] leading-[22px] font-medium capitalize break-words">{selectedForm.expense_type}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Amount</p>
                    <p className="text-[15px] leading-[22px] font-medium">{formatCurrency(selectedForm.amount)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Date Incurred</p>
                    <p className="text-[15px] leading-[22px] font-medium">{formatDate(selectedForm.date_incurred)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Status</p>
                    <Badge variant={selectedForm.status as any}>{selectedForm.status}</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Submitted By</p>
                  <p className="text-[15px] leading-[22px] break-words">{selectedForm.profiles?.first_name} {selectedForm.profiles?.last_name}</p>
                </div>

                <div>
                  <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Event</p>
                  <p className="text-[15px] leading-[22px] break-words">{selectedForm.events?.name}</p>
                </div>

                <div>
                  <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Description</p>
                  <p className="text-[15px] leading-[22px] whitespace-pre-wrap break-words">{selectedForm.description}</p>
                </div>

                {selectedForm.formula_breakdown && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Formula Breakdown</p>
                      <p className="text-[15px] leading-[22px] text-text-body whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                    </div>
                  </>
                )}

                {/* Type-specific data */}
                {selectedForm.transport_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Transport Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Mode</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.transport_data.mode}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Route</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.transport_data.route}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Fare/Person</p><p className="text-[15px] leading-[22px] font-medium">{formatCurrency(selectedForm.transport_data.fare_per_person)}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Persons</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.transport_data.persons}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Trips</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.transport_data.trips}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.food_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Food / Meals Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Meal Type</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.food_data.meal_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Vendor</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.food_data.vendor}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Cost/Person</p><p className="text-[15px] leading-[22px] font-medium">{formatCurrency(selectedForm.food_data.cost_per_person)}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Persons</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.food_data.persons}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Meals</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.food_data.meals}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.supplies_data?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Supplies Items</p>
                      <div className="space-y-1">
                        {selectedForm.supplies_data.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between border-b border-divider pb-1">
                            <span className="flex-1 min-w-0 break-words text-[15px] leading-[22px]">{item.item_name}</span>
                            <span className="w-16 text-right text-[15px] leading-[22px]">{item.qty}x</span>
                            <span className="w-20 text-right text-[15px] leading-[22px]">{formatCurrency(item.unit_cost)}</span>
                            <span className="w-20 text-right text-[15px] leading-[22px] font-medium">{formatCurrency(item.total)}</span>
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
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Labor / Service Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Service Type</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.labor_data.service_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Vendor</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.labor_data.vendor_name || selectedForm.labor_data.vendor}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Rate</p><p className="text-[15px] leading-[22px] font-medium">{formatCurrency(selectedForm.labor_data.rate)}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Persons</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.labor_data.persons}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Duration</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.labor_data.duration} {selectedForm.labor_data.duration_unit}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.other_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Other Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 break-words"><p className="text-[11px] leading-[14px] text-text-secondary">Item</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.other_data.expense_name}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Unit Cost</p><p className="text-[15px] leading-[22px] font-medium">{formatCurrency(selectedForm.other_data.unit_cost)}</p></div>
                        <div><p className="text-[11px] leading-[14px] text-text-secondary">Quantity</p><p className="text-[15px] leading-[22px] font-medium">{selectedForm.other_data.qty}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {/* Witnesses */}
                {selectedForm.witnesses?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Witnesses</p>
                      <div className="space-y-1 text-[13px] leading-[18px]">
                        {selectedForm.witnesses.filter((w: any) => !w._marker).map((w: any, i: number) => (
                          <div key={i} className="text-[13px] leading-[18px]">
                            <span className="text-[15px] leading-[22px] font-medium">{w.name}</span>
                            {w.role && <span className="text-text-secondary text-[13px] leading-[18px]"> — {w.role}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Certification */}
                <Separator />
                <div className="flex items-center gap-2">
                  <div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-neutral-900 dark:bg-white' : 'border-divider')}>
                    {selectedForm.certification && <CheckCircle className="h-3 w-3 text-white dark:text-neutral-900" />}
                  </div>
                  <span className="text-[11px] leading-[14px] text-text-secondary">Certified true and correct</span>
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
        )}
      </ResponsiveDialog>
    </div>
  );
}
