'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { getEvent, getReceipts, getNoReceiptForms, uploadReceipt, confirmReceipt, submitNoReceiptForm, resubmitNoReceiptForm, retryOcr } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveDialog } from '@/components/shared/responsive-dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Upload, Receipt as ReceiptIcon, FileText, CheckCircle, XCircle, Clock, Wallet, Image as ImageIcon, Plus, Trash2, Shield, Download, ChevronRight, Eye, Camera, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { BudgetChart } from '@/components/shared/budget-chart';
import { useDropzone } from 'react-dropzone';
const CameraCapture = dynamic(() => import('@/components/camera/camera-capture').then(m => m.CameraCapture), { ssr: false });
const UploadSheet = dynamic(() => import('@/components/camera/upload-sheet').then(m => m.UploadSheet), { ssr: false });
import type { Event, Receipt, NoReceiptForm } from '@/types';

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

export function EventDetailClient({
  eventId,
  initialEvent,
  initialReceipts,
  initialForms,
}: {
  eventId: string;
  initialEvent: any;
  initialReceipts: any[];
  initialForms: any[];
}) {
  const [event, setEvent] = useState<any>(initialEvent);
  const [receipts, setReceipts] = useState<any[]>(initialReceipts);
  const [forms, setForms] = useState<any[]>(initialForms);

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
  const [uploading, setUploading] = useState(false);
  const [processingReceipt, setProcessingReceipt] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);

  // Receipt review state
  const [reviewReceipt, setReviewReceipt] = useState<any>(null);
  const [reviewParsed, setReviewParsed] = useState<any>(null);
  const [reviewImageUrl, setReviewImageUrl] = useState<string>('');
  const [editingReceipt, setEditingReceipt] = useState<any>(null);

  // No-receipt form state
  const [showForm, setShowForm] = useState(false);
  const [expenseType, setExpenseType] = useState<string>('');
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState<any>({ witnesses: [], certification: false });

  // Resubmit state
  const [resubmitTarget, setResubmitTarget] = useState<any>(null);
  const [resubmitExplanation, setResubmitExplanation] = useState('');

  // Receipt detail modal
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Camera & upload sheet state
  const [showCamera, setShowCamera] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [uploadSource, setUploadSource] = useState<'camera' | 'file' | null>(null);

  // OCR error dialog state
  const [showOcrError, setShowOcrError] = useState<{ imageUrl: string } | null>(null);
  const [ocrRetrying, setOcrRetrying] = useState(false);
  const [ocrErrorCooldown, setOcrErrorCooldown] = useState(false);

  // Form detail modal
  const [selectedForm, setSelectedForm] = useState<any>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setProcessingReceipt(true);
    setUploading(true);
    setUploadSource('file');
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => { URL.revokeObjectURL(url); resolve(); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(); };
        img.src = url;
      });
      if (file.size < 30 * 1024 || img.width < 300 || img.height < 300) {
        toast.warning('Image appears low resolution. OCR accuracy may be reduced. Consider retaking the photo.', { duration: 5000 });
      }
    } catch {}

    try {
      const result = await uploadReceipt(eventId, formData);
      setReviewImageUrl(result.imageUrl);
      setProcessingReceipt(false);

      if (result.ocrFailed || !result.parsed) {
        setShowOcrError({ imageUrl: result.imageUrl });
      } else {
        setReviewParsed(result.parsed);
        setEditingReceipt(result.parsed);
        setReviewReceipt(true);
      }
    } catch (err: any) {
      setProcessingReceipt(false);
      toast.error(err.message || 'Failed to upload receipt');
    }
    setUploading(false);
  }, [eventId]);

  const handleConfirmReceipt = async () => {
    if (!editingReceipt || confirmingReceipt) return;
    setConfirmingReceipt(true);
    try {
      const items = (editingReceipt.items || []).map((i: any) => ({
        ...i,
        total: (i.qty || 0) * (i.unit_price || 0),
      }));
      const itemsTotal = items.reduce((sum: number, i: any) => sum + i.total, 0);
      const computedTotal = (editingReceipt.subtotal || 0) - (editingReceipt.discount || 0);
      const total = computedTotal > 0 ? computedTotal : (editingReceipt.total || itemsTotal);
      await confirmReceipt(eventId, { ...editingReceipt, items, total, image_url: reviewImageUrl });
      toast.success('Receipt approved and budget deducted');
      setReviewReceipt(false);
      setEditingReceipt(null);
      const r = await getReceipts(eventId);
      setReceipts(r);
      const e = await getEvent(eventId);
      setEvent(e);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save receipt');
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleCameraCapture = useCallback(async (file: File) => {
    setShowCamera(false);
    setProcessingReceipt(true);
    setUploading(true);
    setUploadSource('camera');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadReceipt(eventId, formData);
      setReviewImageUrl(result.imageUrl);
      setProcessingReceipt(false);

      if (result.ocrFailed || !result.parsed) {
        setShowOcrError({ imageUrl: result.imageUrl });
      } else {
        setReviewParsed(result.parsed);
        setEditingReceipt(result.parsed);
        setReviewReceipt(true);
      }
    } catch (err: any) {
      setProcessingReceipt(false);
      toast.error(err.message || 'Failed to upload receipt');
    }
    setUploading(false);
  }, [eventId]);

  const handleRetake = useCallback(() => {
    setShowOcrError(null);
    if (uploadSource === 'camera') {
      setShowCamera(true);
    } else {
      setShowUploadSheet(true);
    }
  }, [uploadSource]);

  const handleRetryOcr = useCallback(async () => {
    if (!showOcrError) return;
    setOcrRetrying(true);
    try {
      const result = await retryOcr(eventId, showOcrError.imageUrl);
      if (!result.ocrFailed && result.parsed) {
        setShowOcrError(null);
        setReviewParsed(result.parsed);
        setEditingReceipt(result.parsed);
        setReviewReceipt(true);
        toast.success('Receipt read successfully');
      } else {
        setOcrErrorCooldown(true);
        setTimeout(() => setOcrErrorCooldown(false), 3000);
        toast.error('Still couldn\'t read the receipt. Try taking a clearer photo.');
      }
    } catch {
      toast.error('Failed to retry OCR');
    }
    setOcrRetrying(false);
  }, [eventId, showOcrError]);

  const handleEnterManually = useCallback(() => {
    setShowOcrError(null);
    setReviewParsed(null);
    setEditingReceipt({ vendor: '', si_or_number: '', date: '', time: '', items: [], subtotal: 0, discount: 0, total: 0, category: '', category_reasoning: '', confidence: 0 });
    setReviewReceipt(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: event?.status === 'done' || uploading,
  });

  // Budget chart data
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

  const [submittingForm, setSubmittingForm] = useState(false);

  const handleSubmitForm = async () => {
    if (submittingForm) return;
    setSubmittingForm(true);
    try {
      let amount = 0;
      if (expenseType === 'transport') {
        amount = (formData.fare_per_person || 0) * (formData.persons || 0) * (formData.trips || 0);
      } else if (expenseType === 'food') {
        amount = (formData.cost_per_person || 0) * (formData.persons || 0) * (formData.meals || 0);
      } else if (expenseType === 'supplies') {
        amount = (formData.items || []).reduce((sum: number, i: any) => sum + ((i.unit_cost || 0) * (i.qty || 0)), 0);
      } else if (expenseType === 'labor') {
        amount = (formData.rate || 0) * (formData.persons || 0) * (formData.duration || 0);
      } else if (expenseType === 'other') {
        amount = (formData.unit_cost || 0) * (formData.qty || 1);
      }

      const payload = {
        event_id: eventId,
        expense_type: expenseType as any,
        expense_name: formData.expense_name,
        date_incurred: formData.date_incurred,
        description: formData.description,
        amount,
        formula_breakdown: formData.formula_breakdown || '',
        witnesses: formData.witnesses || [],
        certification: formData.certification || false,
        transport_data: expenseType === 'transport' ? formData : null,
        food_data: expenseType === 'food' ? formData : null,
        supplies_data: expenseType === 'supplies' ? formData.items : null,
        labor_data: expenseType === 'labor' ? formData : null,
        other_data: expenseType === 'other' ? formData : null,
      };

      await submitNoReceiptForm(payload);
      toast.success('Form submitted for review');
      setShowForm(false);
      setFormStep(1);
      setExpenseType('');
      setFormData({ witnesses: [], certification: false });
      const f = await getNoReceiptForms(eventId);
      setForms(f);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit form');
    } finally {
      setSubmittingForm(false);
    }
  };

  const [resubmitting, setResubmitting] = useState(false);

  const handleResubmit = async () => {
    if (resubmitting) return;
    if (!resubmitTarget || !resubmitExplanation.trim()) {
      toast.error('Please provide an explanation');
      return;
    }
    setResubmitting(true);
    try {
      await resubmitNoReceiptForm(resubmitTarget.id, eventId, resubmitExplanation);
      toast.success('Form resubmitted for review');
      setResubmitTarget(null);
      setResubmitExplanation('');
      const f = await getNoReceiptForms(eventId);
      setForms(f);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resubmit form');
    } finally {
      setResubmitting(false);
    }
  };

  if (!event) return <div className="text-text-body text-[15px] leading-[22px]">Event not found</div>;

  const isViewOnly = event.status === 'done';

  return (
    <div className="space-y-6">
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
                  <BudgetChart used={totalExpenses} remaining={event?.budget || 0} size={108} />
                </div>
                <div className="flex-[2] flex flex-col justify-center gap-2 pt-4 pb-5 pr-5 pl-4">
                  <div>
                    <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">Total</p>
                    <AnimatedCurrency value={totalExpenses + (event?.budget || 0)} className="text-[12px] font-semibold text-text-primary leading-tight" />
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
                      <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', event?.budget < 0 ? 'bg-error animate-pulse' : 'bg-text-secondary/30')} />
                      <AnimatedCurrency
                        value={event?.budget || 0}
                        className={cn('text-[12px] font-semibold leading-tight', event?.budget < 0 ? 'text-error' : 'text-text-primary')}
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

      {/* Main Content Tabs */}
      <Tabs defaultValue="receipts">
        <TabsList className="bg-surface-gray p-1 rounded-lg">
          <TabsTrigger value="receipts" className="flex items-center gap-2 data-[state=active]:bg-surface-white data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all duration-300 ease-out">
            <ReceiptIcon className="h-4 w-4" /> Receipts
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2 data-[state=active]:bg-surface-white data-[state=active]:shadow-sm data-[state=active]:rounded-md transition-all duration-300 ease-out">
            <FileText className="h-4 w-4" /> No-Receipt Forms
          </TabsTrigger>
        </TabsList>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <motion.div
            key="receipts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          {!isViewOnly && (
            <>
              {/* Desktop dropzone */}
              <div
                {...getRootProps()}
                className={`hidden lg:block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ease-out ${isDragActive ? 'border-primary scale-[1.01] bg-primary-tint-bg/30' : 'border-divider hover:border-primary'}`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-text-placeholder" />
                <p className="text-[15px] leading-[22px] text-text-placeholder">
                  {isDragActive ? 'Drop receipt here' : 'Drop receipt image or click to upload'}
                </p>
                <p className="text-[13px] leading-[18px] text-text-placeholder mt-1">PNG, JPG, JPEG, WEBP</p>
              </div>

              {/* Mobile upload button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowUploadSheet(true)}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-divider rounded-xl p-6 text-center hover:border-primary transition-colors disabled:opacity-50"
                >
                  <Camera className="h-6 w-6 text-text-placeholder" />
                  <div className="text-left">
                    <p className="text-[15px] leading-[22px] font-medium text-text-body">Upload Receipt</p>
                    <p className="text-[13px] leading-[18px] text-text-placeholder">Take a photo or browse files</p>
                  </div>
                </button>
              </div>

              {/* Upload sheet (mobile) */}
              <UploadSheet
                open={showUploadSheet}
                onClose={() => setShowUploadSheet(false)}
                onTakePhoto={() => setShowCamera(true)}
                onBrowseFiles={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      onDrop([file]);
                    }
                  };
                  input.click();
                }}
              />

              {/* Camera capture (mobile) */}
              {showCamera && (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  onClose={() => setShowCamera(false)}
                />
              )}
            </>
          )}

          <AnimatePresence mode="wait">
            {receipts.length === 0 ? (
              <motion.div
                key="empty-receipts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <Card className="bg-surface-white rounded-xl shadow-sm">
                  <CardContent className="text-center py-8 text-[15px] leading-[22px] text-text-secondary">
                    No receipts uploaded yet
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="receipt-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {receipts.map((receipt, index) => (
                    <motion.div
                      key={receipt.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <button onClick={() => setSelectedReceipt(receipt)} className="text-left w-full">
                        <Card className="bg-surface-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out">
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
                                <p className="text-[15px] leading-[22px] font-medium truncate text-text-primary">{receipt.vendor || 'Unknown Vendor'}</p>
                                <p className="text-[13px] leading-[18px] text-text-secondary break-words">{receipt.category}</p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[15px] leading-[22px] font-semibold text-text-primary">{formatCurrency(receipt.total)}</span>
                                  <Badge variant={receipt.status as any} className={cn(
                                    'text-[11px] leading-[14px] px-1.5 py-0',
                                    receipt.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0',
                                    receipt.status === 'pending' && 'bg-amber-50 text-amber-700 border-0',
                                    receipt.status === 'rejected' && 'bg-red-50 text-error border-0',
                                  )}>
                                    {receipt.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        </TabsContent>

        {/* No-Receipt Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          <motion.div
            key="forms"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          {!isViewOnly && (
            <>
            <Button className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> New No-Receipt Form
              </Button>
              <ResponsiveDialog open={showForm} onOpenChange={setShowForm} title="No-Receipt Form" description="Submit an expense without a receipt">

                {formStep === 1 && (
                  <div className="space-y-4">
                    <Label className="text-[13px] leading-[18px] text-text-secondary">Expense Type</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'transport', label: 'Transport', icon: '🚌' },
                        { value: 'food', label: 'Food / Meals', icon: '🍽️' },
                        { value: 'supplies', label: 'Supplies', icon: '📦' },
                        { value: 'labor', label: 'Labor / Service', icon: '🔧' },
                        { value: 'other', label: 'Other', icon: '📋' },
                      ].map((type) => (
                        <button
                          key={type.value}
                          onClick={() => { setExpenseType(type.value); setFormStep(2); }}
                          className="flex flex-col items-center gap-2 p-6 rounded-xl border border-divider hover:border-primary hover:bg-primary-tint-bg transition-all duration-300 ease-out"
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <span className="text-[15px] leading-[22px] font-medium text-text-primary">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formStep === 2 && expenseType && (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setFormStep(1)} className="mb-2 transition-all duration-300 ease-out">
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>

                    <div className="space-y-2">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Activity/Event Name</Label>
                      <Input value={formData.expense_name || ''} onChange={e => setFormData({...formData, expense_name: e.target.value})} placeholder="e.g., Team building lunch" className="border-divider" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Date Incurred</Label>
                      <Input type="date" value={formData.date_incurred || ''} onChange={e => setFormData({...formData, date_incurred: e.target.value})} className="border-divider" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Brief Description</Label>
                      <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the expense..." className="border-divider" />
                    </div>

                    {/* Type-specific fields */}
                    {expenseType === 'transport' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Mode of Transport</Label>
                            <Input value={formData.mode || ''} onChange={e => setFormData({...formData, mode: e.target.value})} placeholder="e.g., Jeepney" className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Route</Label>
                            <Input value={formData.route || ''} onChange={e => setFormData({...formData, route: e.target.value})} placeholder="e.g., SM to Campus" className="border-divider" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Fare per Person</Label>
                            <Input type="number" value={formData.fare_per_person || ''} onChange={e => setFormData({...formData, fare_per_person: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">No. of Trips</Label>
                            <Input type="number" value={formData.trips || ''} onChange={e => setFormData({...formData, trips: Number(e.target.value)})} className="border-divider" />
                            <p className="text-[11px] leading-[14px] text-text-placeholder">Round trip = 2 trips</p>
                          </div>
                        </div>
                      </>
                    )}

                    {expenseType === 'food' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Meal Type</Label>
                            <Input value={formData.meal_type || ''} onChange={e => setFormData({...formData, meal_type: e.target.value})} placeholder="e.g., Lunch" className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Vendor/Stall</Label>
                            <Input value={formData.vendor || ''} onChange={e => setFormData({...formData, vendor: e.target.value})} className="border-divider" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Cost per Person</Label>
                            <Input type="number" value={formData.cost_per_person || ''} onChange={e => setFormData({...formData, cost_per_person: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">No. of Meals</Label>
                            <Input type="number" value={formData.meals || ''} onChange={e => setFormData({...formData, meals: Number(e.target.value)})} className="border-divider" />
                          </div>
                        </div>
                      </>
                    )}

                    {expenseType === 'supplies' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] leading-[18px] text-text-secondary">Items</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, items: [...(formData.items || []), { item_name: '', unit_cost: 0, qty: 1, total: 0 }]})} className="transition-all duration-300 ease-out">
                            <Plus className="h-3 w-3 mr-1" /> Add Item
                          </Button>
                        </div>
                        {(formData.items || []).map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-4 gap-2 items-end">
                            <div className="space-y-1 col-span-2">
                              <Label className="text-[11px] leading-[14px] text-text-secondary">Item Name</Label>
                              <Input size={1} value={item.item_name} onChange={e => {
                                const items = [...(formData.items || [])];
                                items[i].item_name = e.target.value;
                                setFormData({...formData, items});
                              }} className="border-divider" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] leading-[14px] text-text-secondary">Unit Cost</Label>
                              <Input type="number" value={item.unit_cost || ''} onChange={e => {
                                const items = [...(formData.items || [])];
                                items[i].unit_cost = Number(e.target.value);
                                items[i].total = items[i].unit_cost * items[i].qty;
                                setFormData({...formData, items});
                              }} className="border-divider" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] leading-[14px] text-text-secondary">QTY</Label>
                              <div className="flex gap-1">
                                <Input type="number" value={item.qty || 1} onChange={e => {
                                  const items = [...(formData.items || [])];
                                  items[i].qty = Number(e.target.value);
                                  items[i].total = items[i].unit_cost * items[i].qty;
                                  setFormData({...formData, items});
                                }} className="border-divider" />
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 transition-all duration-300 ease-out" onClick={() => {
                                  const items = formData.items.filter((_: any, idx: number) => idx !== i);
                                  setFormData({...formData, items});
                                }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {expenseType === 'labor' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Service Type</Label>
                            <Input value={formData.service_type || ''} onChange={e => setFormData({...formData, service_type: e.target.value})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Vendor Name</Label>
                            <Input value={formData.vendor_name || ''} onChange={e => setFormData({...formData, vendor_name: e.target.value})} className="border-divider" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Rate</Label>
                            <Input type="number" value={formData.rate || ''} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Duration</Label>
                            <div className="flex gap-1">
                              <Input type="number" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} className="border-divider" />
                              <select className="h-9 rounded-lg border border-divider bg-transparent text-[13px] leading-[18px] px-1" value={formData.duration_unit || 'days'} onChange={e => setFormData({...formData, duration_unit: e.target.value})}>
                                <option value="days">Days</option>
                                <option value="hours">Hours</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {expenseType === 'other' && (
                      <div className="space-y-2">
                        <Label className="text-[13px] leading-[18px] text-text-secondary">Expense Name</Label>
                        <Input value={formData.expense_name || ''} onChange={e => setFormData({...formData, expense_name: e.target.value})} className="border-divider" />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Unit Cost</Label>
                            <Input type="number" value={formData.unit_cost || ''} onChange={e => setFormData({...formData, unit_cost: Number(e.target.value)})} className="border-divider" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[13px] leading-[18px] text-text-secondary">Quantity</Label>
                            <Input type="number" value={formData.qty || 1} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} className="border-divider" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Formula Breakdown */}
                    {(expenseType === 'transport' || expenseType === 'food' || expenseType === 'labor') && (
                      <div className="bg-surface-gray rounded-xl p-4 text-[15px] leading-[22px]">
                        <p className="font-medium mb-1 text-text-primary">Formula Breakdown</p>
                        {expenseType === 'transport' && (
                          <p className="text-text-secondary">
                            ₱{(formData.fare_per_person || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.trips || 0} trips = <span className="font-semibold text-text-primary">{formatCurrency((formData.fare_per_person || 0) * (formData.persons || 0) * (formData.trips || 0))}</span>
                          </p>
                        )}
                        {expenseType === 'food' && (
                          <p className="text-text-secondary">
                            ₱{(formData.cost_per_person || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.meals || 0} meals = <span className="font-semibold text-text-primary">{formatCurrency((formData.cost_per_person || 0) * (formData.persons || 0) * (formData.meals || 0))}</span>
                          </p>
                        )}
                        {expenseType === 'labor' && (
                          <p className="text-text-secondary">
                            ₱{(formData.rate || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.duration || 0} {formData.duration_unit || 'days'} = <span className="font-semibold text-text-primary">{formatCurrency((formData.rate || 0) * (formData.persons || 0) * (formData.duration || 0))}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {expenseType === 'supplies' && (
                      <div className="bg-surface-gray rounded-xl p-4 text-[15px] leading-[22px]">
                        <p className="font-medium text-text-primary">Total: {formatCurrency((formData.items || []).reduce((sum: number, i: any) => sum + (i.unit_cost || 0) * (i.qty || 0), 0))}</p>
                      </div>
                    )}

                    {expenseType === 'other' && (
                      <div className="bg-surface-gray rounded-xl p-4 text-[15px] leading-[22px]">
                        <p className="font-medium text-text-primary">Total: {formatCurrency((formData.unit_cost || 0) * (formData.qty || 1))}</p>
                      </div>
                    )}

                    <Separator />
                    <Button type="button" variant="secondary" onClick={() => setFormStep(3)} className="transition-all duration-300 ease-out">
                      Next: Witnesses & Certification
                    </Button>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setFormStep(2)} className="mb-2 transition-all duration-300 ease-out">
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>

                    {/* Witnesses */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] leading-[18px] text-text-secondary">Witnesses</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, witnesses: [...(formData.witnesses || []), { name: '', role: '' }]})} className="transition-all duration-300 ease-out">
                          <Plus className="h-3 w-3 mr-1" /> Add Witness
                        </Button>
                      </div>
                      {(formData.witnesses || []).map((w: any, i: number) => (
                        <div key={i} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[11px] leading-[14px] text-text-secondary">Full Name</Label>
                            <Input value={w.name} onChange={e => {
                              const ws = [...formData.witnesses];
                              ws[i].name = e.target.value;
                              setFormData({...formData, witnesses: ws});
                            }} placeholder="Full name of witness" className="border-divider" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[11px] leading-[14px] text-text-secondary">Role/Position (optional)</Label>
                            <Input value={w.role || ''} onChange={e => {
                              const ws = [...formData.witnesses];
                              ws[i].role = e.target.value;
                              setFormData({...formData, witnesses: ws});
                            }} placeholder="e.g., Class president" className="border-divider" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 mb-0 transition-all duration-300 ease-out" onClick={() => setFormData({...formData, witnesses: formData.witnesses.filter((_: any, idx: number) => idx !== i)})}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Certification */}
                    <label className="flex items-start gap-3 p-4 rounded-xl border border-divider cursor-pointer transition-all duration-300 ease-out">
                      <input type="checkbox" className="mt-1 h-4 w-4" checked={formData.certification || false} onChange={e => setFormData({...formData, certification: e.target.checked})} />
                      <span className="text-[15px] leading-[22px] text-text-secondary">
                        I certify that the above is true and correct and that no receipt was issued for this expense.
                      </span>
                    </label>

                    <Button onClick={handleSubmitForm} disabled={!formData.certification || submittingForm} className="w-full bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                      {submittingForm ? 'Submitting...' : 'Submit for Review'}
                    </Button>
                  </div>
                )}
              </ResponsiveDialog>
            </>
          )}

          <AnimatePresence mode="wait">
            {forms.length === 0 ? (
              <motion.div
                key="empty-forms"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <Card className="bg-surface-white rounded-xl shadow-sm">
                  <CardContent className="text-center py-8 text-[15px] leading-[22px] text-text-secondary">
                    No no-receipt forms yet
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="form-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="space-y-3">
                  {forms.map((form, index) => (
                    <motion.div
                      key={form.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 20 }}
                    >
                      <div onClick={() => setSelectedForm(form)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSelectedForm(form)} className="w-full text-left">
                        <Card className="bg-surface-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] leading-[22px] font-medium text-text-primary">{form.expense_name}</span>
                                  <Badge variant={form.status as any} className={cn(
                                    'text-[11px] leading-[14px]',
                                    form.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0',
                                    form.status === 'pending' && 'bg-amber-50 text-amber-700 border-0',
                                    form.status === 'rejected' && 'bg-red-50 text-error border-0',
                                  )}>{form.status}</Badge>
                                </div>
                                <p className="text-[13px] leading-[18px] text-text-secondary mt-1 whitespace-pre-wrap break-words">{form.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-[13px] leading-[18px] text-text-secondary">
                                  <span>{formatCurrency(form.amount)}</span>
                                  <span>{form.expense_type}</span>
                                  <span>{formatDate(form.created_at)}</span>
                                </div>
                                {form.rejection_reason && (
                                  <div className="mt-2 text-[13px] leading-[18px] text-error bg-error/10 rounded-xl p-2">
  Rejection reason: <span className="min-w-0 break-words">{form.rejection_reason}</span>
                                </div>
                              )}
                              {form.rejection_reason && form.status === 'pending' && (
                                <Button size="sm" variant="outline" className="mt-2 transition-all duration-300 ease-out" onClick={(e) => { e.stopPropagation(); setResubmitTarget(form); setResubmitExplanation(''); }}>
                                  Resubmit with Explanation
                                </Button>
                              )}
                              </div>
                              {form.transaction_hash && (
                                <Badge className="bg-primary-tint-bg text-primary-tint-text flex items-center gap-1 text-[11px] leading-[14px] border-0">
                                  <Shield className="h-3 w-3" /> Verified
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Resubmit Dialog */}
      <ResponsiveDialog open={!!resubmitTarget} onOpenChange={(open) => { if (!open) { setResubmitTarget(null); setResubmitExplanation(''); } }} title="Resubmit No-Receipt Form" description="Provide an explanation for why this expense should be approved.">
          <div className="space-y-4">
            {resubmitTarget?.rejection_reason && (
              <div className="text-[13px] leading-[18px] text-error bg-error/10 rounded-xl p-2">
                Previous rejection reason: {resubmitTarget.rejection_reason}
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[13px] leading-[18px] text-text-secondary">Your Explanation</Label>
              <Textarea
                value={resubmitExplanation}
                onChange={e => setResubmitExplanation(e.target.value)}
                placeholder="Explain why this expense should be reconsidered..."
                rows={4}
                className="border-divider"
              />
            </div>
            <Button className="w-full bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out" onClick={handleResubmit} disabled={!resubmitExplanation.trim() || resubmitting}>
              {resubmitting ? 'Submitting...' : 'Submit Explanation'}
            </Button>
          </div>
      </ResponsiveDialog>

      {/* Form Detail Modal */}
      <ResponsiveDialog open={!!selectedForm} onOpenChange={(open) => !open && setSelectedForm(null)} title={selectedForm?.expense_name || ''} description="No-Receipt Form Details">
          {selectedForm && (
            <>
              <div className="space-y-4 min-w-0">
                <div className="grid grid-cols-2 gap-3 text-[15px] leading-[22px]">
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Expense Type</p>
                    <p className="font-medium capitalize break-words text-text-primary">{selectedForm.expense_type}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Amount</p>
                    <p className="font-medium text-text-primary">{formatCurrency(selectedForm.amount)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Date Incurred</p>
                    <p className="font-medium text-text-primary">{formatDate(selectedForm.date_incurred)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[18px] text-text-secondary">Status</p>
                    <Badge variant={selectedForm.status as any} className={cn(
                      'text-[11px] leading-[14px]',
                      selectedForm.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0',
                      selectedForm.status === 'pending' && 'bg-amber-50 text-amber-700 border-0',
                      selectedForm.status === 'rejected' && 'bg-red-50 text-error border-0',
                    )}>{selectedForm.status}</Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Description</p>
                  <p className="text-[15px] leading-[22px] text-text-body whitespace-pre-wrap break-words">{selectedForm.description}</p>
                </div>

                {selectedForm.formula_breakdown && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-1">Formula Breakdown</p>
                      <p className="text-[15px] leading-[22px] text-text-secondary whitespace-pre-wrap break-words">{selectedForm.formula_breakdown}</p>
                    </div>
                  </>
                )}

                {/* Type-specific data */}
                {selectedForm.transport_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Transport Details</p>
                      <div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]">
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Mode</p><p className="text-text-body">{selectedForm.transport_data.mode}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Route</p><p className="text-text-body">{selectedForm.transport_data.route}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Fare/Person</p><p className="text-text-body">{formatCurrency(selectedForm.transport_data.fare_per_person)}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.transport_data.persons}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Trips</p><p className="text-text-body">{selectedForm.transport_data.trips}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.food_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Food / Meals Details</p>
                      <div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]">
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Meal Type</p><p className="text-text-body">{selectedForm.food_data.meal_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Vendor</p><p className="text-text-body">{selectedForm.food_data.vendor}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Cost/Person</p><p className="text-text-body">{formatCurrency(selectedForm.food_data.cost_per_person)}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.food_data.persons}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Meals</p><p className="text-text-body">{selectedForm.food_data.meals}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.supplies_data?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Supplies Items</p>
                      <div className="space-y-1 text-[15px] leading-[22px]">
                        {selectedForm.supplies_data.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-[13px] leading-[18px] border-b border-divider pb-1">
                            <span className="flex-1 min-w-0 break-words text-text-body">{item.item_name}</span>
                            <span className="w-16 text-right text-text-secondary">{item.qty}x</span>
                            <span className="w-20 text-right text-text-secondary">{formatCurrency(item.unit_cost)}</span>
                            <span className="w-20 text-right font-medium text-text-primary">{formatCurrency(item.total)}</span>
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
                      <div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]">
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Service Type</p><p className="text-text-body">{selectedForm.labor_data.service_type}</p></div>
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Vendor</p><p className="text-text-body">{selectedForm.labor_data.vendor_name || selectedForm.labor_data.vendor}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Rate</p><p className="text-text-body">{formatCurrency(selectedForm.labor_data.rate)}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Persons</p><p className="text-text-body">{selectedForm.labor_data.persons}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Duration</p><p className="text-text-body">{selectedForm.labor_data.duration} {selectedForm.labor_data.duration_unit}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {selectedForm.other_data && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary mb-2 font-semibold">Other Details</p>
                      <div className="grid grid-cols-2 gap-2 text-[15px] leading-[22px]">
                        <div className="min-w-0 break-words"><p className="text-[13px] leading-[18px] text-text-placeholder">Item</p><p className="text-text-body">{selectedForm.other_data.expense_name}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Unit Cost</p><p className="text-text-body">{formatCurrency(selectedForm.other_data.unit_cost)}</p></div>
                        <div><p className="text-[13px] leading-[18px] text-text-placeholder">Quantity</p><p className="text-text-body">{selectedForm.other_data.qty}</p></div>
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
                      <div className="space-y-1 text-[15px] leading-[22px]">
                        {selectedForm.witnesses.filter((w: any) => !w._marker).map((w: any, i: number) => (
                          <div key={i} className="text-[13px] leading-[18px]">
                            <span className="font-medium text-text-primary">{w.name}</span>
                            {w.role && <span className="text-text-secondary"> — {w.role}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Certification */}
                <Separator />
                <div className="flex items-center gap-2">
                  <div className={cn('h-4 w-4 rounded border flex items-center justify-center', selectedForm.certification ? 'bg-primary text-white' : 'border-divider')}>
                    {selectedForm.certification && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-[13px] leading-[18px] text-text-secondary">Certified true and correct</span>
                </div>

                {/* Rejection */}
                {selectedForm.rejection_reason && (
                  <>
                    <Separator />
                    <div className="text-[13px] leading-[18px] text-error bg-error/10 rounded-xl p-3">
                      <p className="font-medium mb-1">Rejection Reason</p>
                      <p className="whitespace-pre-wrap break-words">{selectedForm.rejection_reason}</p>
                    </div>
                  </>
                )}

                {/* Blockchain */}
                {selectedForm.transaction_hash && (
                  <>
                    <Separator />
                    <Badge className="bg-primary-tint-bg text-primary-tint-text flex items-center gap-1 border-0">
                      <Shield className="h-3 w-3" /> Blockchain Verified
                    </Badge>
                  </>
                )}
              </div>
            </>
          )}
      </ResponsiveDialog>

      {/* Financial Report Section */}
      {receipts.filter(r => r.status === 'approved').length > 0 || forms.filter(f => f.status === 'approved').length > 0 ? (
        <Card className="bg-surface-white rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-[17px] leading-6 font-[590] tracking-[-0.02em]">Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/officer/reports/${eventId}`} prefetch={true}>
              <Button variant="secondary" className="transition-all duration-300 ease-out">
                <FileText className="h-4 w-4 mr-2" /> View Financial Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* OCR Error Dialog */}
      <ResponsiveDialog open={!!showOcrError} onOpenChange={(open) => { if (!open) setShowOcrError(null); }} title="We couldn't read the receipt right now" description="The receipt image could not be read. Try taking a clearer photo with better lighting, or tap Retry to try again.">
          {showOcrError && (
            <div className="space-y-4">
              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-surface-gray">
                <Image src={showOcrError.imageUrl} alt="Receipt" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetake} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                  <Camera className="h-4 w-4 mr-2" /> Take Photo Again
                </Button>
                <Button onClick={handleRetryOcr} disabled={ocrRetrying || ocrErrorCooldown} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                  {ocrRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {ocrRetrying ? 'Reading receipt...' : ocrErrorCooldown ? 'Please wait...' : 'Retry OCR'}
                </Button>
                <Button variant="outline" onClick={handleEnterManually} className="transition-all duration-300 ease-out">
                  <FileText className="h-4 w-4 mr-2" /> Enter Manually
                </Button>
              </div>
            </div>
          )}
      </ResponsiveDialog>

      {/* Receipt Review Modal */}
      <ResponsiveDialog open={!!reviewReceipt} onOpenChange={(open) => { if (!open) { setReviewReceipt(false); setEditingReceipt(null); } }} title={reviewParsed ? 'Review Receipt Data' : 'Manual Receipt Entry'} description={reviewParsed ? 'Verify the OCR-parsed data below and confirm to deduct from budget.' : 'OCR parsing failed. Please fill in the receipt details manually.'}>
          {editingReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full h-48">
                  <Image src={reviewImageUrl} alt="Receipt" fill className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[13px] leading-[18px] text-text-secondary">Vendor / Store Name</Label>
                    <Input value={editingReceipt.vendor || ''} onChange={e => setEditingReceipt({...editingReceipt, vendor: e.target.value})} className="border-divider" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">SI/OR Number</Label>
                      <Input value={editingReceipt.si_or_number || ''} onChange={e => setEditingReceipt({...editingReceipt, si_or_number: e.target.value})} className="border-divider" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Category</Label>
                      <Input value={editingReceipt.category || ''} onChange={e => setEditingReceipt({...editingReceipt, category: e.target.value})} placeholder="e.g., Hardware, Office Supplies" className="border-divider" />
                      {editingReceipt.category_reasoning && (
                        <p className="text-[11px] leading-[14px] text-text-placeholder mt-0.5 italic">OCR: {editingReceipt.category_reasoning}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Date</Label>
                      <Input value={editingReceipt.date || ''} onChange={e => setEditingReceipt({...editingReceipt, date: e.target.value})} placeholder="MM/DD/YYYY" className="border-divider" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[13px] leading-[18px] text-text-secondary">Time</Label>
                      <Input value={editingReceipt.time || ''} onChange={e => setEditingReceipt({...editingReceipt, time: e.target.value})} placeholder="HH:MM" className="border-divider" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[13px] leading-[18px] text-text-secondary">Line Items</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReceipt({...editingReceipt, items: [...(editingReceipt.items || []), { name: '', qty: 1, unit_price: 0, total: 0 }]})} className="transition-all duration-300 ease-out">
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {(editingReceipt.items || []).map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[11px] leading-[14px] text-text-secondary">Item</Label>
                      <Input size={1} value={item.name} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].name = e.target.value;
                        setEditingReceipt({...editingReceipt, items});
                      }} className="border-divider" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] leading-[14px] text-text-secondary">QTY</Label>
                      <Input type="number" value={item.qty || 1} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].qty = Number(e.target.value);
                        items[i].total = items[i].qty * (items[i].unit_price || 0);
                        setEditingReceipt({...editingReceipt, items});
                      }} className="border-divider" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] leading-[14px] text-text-secondary">Price</Label>
                      <Input type="number" value={item.unit_price || 0} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].unit_price = Number(e.target.value);
                        items[i].total = items[i].qty * items[i].unit_price;
                        setEditingReceipt({...editingReceipt, items});
                      }} className="border-divider" />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 transition-all duration-300 ease-out" onClick={() => setEditingReceipt({...editingReceipt, items: editingReceipt.items.filter((_: any, idx: number) => idx !== i)})}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {(editingReceipt.subtotal !== undefined || editingReceipt.discount !== undefined) && (
                <div className="space-y-1 bg-surface-gray p-3 rounded-xl">
                  <div className="flex justify-between text-[15px] leading-[22px]">
                    <span className="text-text-body">Subtotal</span>
                    <span className="text-text-primary">{formatCurrency(editingReceipt.subtotal || 0)}</span>
                  </div>
                  {editingReceipt.discount > 0 && (
                    <div className="flex justify-between text-[15px] leading-[22px] text-primary-tint-text">
                      <span>Discount</span>
                      <span>-{formatCurrency(editingReceipt.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[15px] leading-[22px] font-bold border-t border-divider pt-1 mt-1">
                    <span className="text-text-primary">Amount Due (OCR)</span>
                    <span className="text-text-primary">{formatCurrency(editingReceipt.total || 0)}</span>
                  </div>
                  {editingReceipt.discount > 0 && (
                    <p className="text-[11px] leading-[14px] text-text-placeholder mt-1">Total above is the final amount due. Verify the line item totals below match.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between bg-surface-gray p-3 rounded-xl">
                <span className="text-[15px] leading-[22px] font-medium text-text-primary">Total from Items</span>
                <span className="text-lg font-bold text-text-primary">
                  {formatCurrency((editingReceipt.items || []).reduce((sum: number, i: any) => sum + (i.total || 0), 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setReviewReceipt(false); setEditingReceipt(null); }} className="transition-all duration-300 ease-out">
                  Cancel
                </Button>
                <Button onClick={handleConfirmReceipt} disabled={confirmingReceipt} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                  {confirmingReceipt ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm & Deduct from Budget'}
                </Button>
              </div>
            </div>
          )}
      </ResponsiveDialog>

      {/* Processing overlay */}
      {processingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-white p-8 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
            <p className="text-[15px] leading-[22px] font-medium text-text-body">Processing receipt...</p>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      <ResponsiveDialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)} title={selectedReceipt?.vendor || 'Receipt Details'}>
          {selectedReceipt && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full h-64">
                  {selectedReceipt.image_url && (
                    <Image src={selectedReceipt.image_url} alt="Receipt" fill className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[13px] leading-[18px] text-text-secondary">Vendor</p>
                    <p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.vendor || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[13px] leading-[18px] text-text-secondary">SI/OR Number</p>
                    <p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.si_or_number || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary">Date</p>
                      <p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.date || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[13px] leading-[18px] text-text-secondary">Time</p>
                      <p className="text-[15px] leading-[22px] font-medium text-text-primary">{selectedReceipt.time || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[13px] leading-[18px] text-text-secondary">Category</p>
                    <Badge className="bg-primary-tint-bg text-primary-tint-text border-0">{selectedReceipt.category} — {selectedReceipt.confidence || 0}%</Badge>
                  </div>
                  <Separator />
                  {selectedReceipt.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-[13px] leading-[18px]">
                      <span className="flex-1 text-text-body">{item.name}</span>
                      <span className="w-12 text-right text-text-secondary">{item.qty}</span>
                      <span className="w-20 text-right text-text-body">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span className="text-text-primary">Total</span>
                    <span className="text-text-primary">{formatCurrency(selectedReceipt.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={selectedReceipt.status as any} className={cn(
                      'text-[11px] leading-[14px]',
                      selectedReceipt.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0',
                      selectedReceipt.status === 'pending' && 'bg-amber-50 text-amber-700 border-0',
                      selectedReceipt.status === 'rejected' && 'bg-red-50 text-error border-0',
                    )}>{selectedReceipt.status}</Badge>
                    {selectedReceipt.transaction_hash && (
                      <Badge className="bg-primary-tint-bg text-primary-tint-text flex items-center gap-1 border-0">
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
