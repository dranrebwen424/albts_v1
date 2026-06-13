'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import { ArrowLeft, Upload, Receipt as ReceiptIcon, FileText, CheckCircle, XCircle, Clock, Wallet, Image as ImageIcon, Plus, Trash, Shield, Download, CaretRight, Eye, Camera, Spinner, ArrowsClockwise, ChartBar, Funnel, ClipboardText} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { BudgetChart } from '@/components/shared/budget-chart';
import { CategoryBarChart } from '@/components/shared/category-bar-chart';
import { useDropzone } from 'react-dropzone';
import { useSidebarStore } from '@/stores/sidebar';
const CameraCapture = dynamic(() => import('@/components/camera/camera-capture').then(m => m.CameraCapture), { ssr: false });
const UploadSheet = dynamic(() => import('@/components/camera/upload-sheet').then(m => m.UploadSheet), { ssr: false });
import type { Event, Receipt, NoReceiptForm, ExpenseStatus } from '@/types';

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

  // Desktop layout state
  const { isMobile } = useSidebarStore();
  const [expensesTab, setExpensesTab] = useState<'expenses' | 'report'>('expenses');
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [addEntryStep, setAddEntryStep] = useState<'choose' | 'receipt-upload' | 'no-receipt-form' | 'success'>('choose');
  const [successType, setSuccessType] = useState<'receipt' | 'no-receipt'>('receipt');
  const [filterType, setFilterType] = useState<'all' | 'receipt' | 'no-receipt'>('all');
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | 'all'>('all');
  const [filterDate, setFilterDate] = useState<'newest' | 'oldest'>('newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mergedExpenses = useMemo(() => {
    const items: ({ _type: 'receipt' } & any)[] = receipts.map(r => ({ ...r, _type: 'receipt' as const }));
    const formItems: ({ _type: 'no-receipt' } & any)[] = forms.map(f => ({ ...f, _type: 'no-receipt' as const }));
    let combined = [...items, ...formItems];

    if (filterType === 'receipt') combined = combined.filter(i => i._type === 'receipt');
    if (filterType === 'no-receipt') combined = combined.filter(i => i._type === 'no-receipt');
    if (filterStatus !== 'all') combined = combined.filter(i => i.status === filterStatus);

    combined.sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return filterDate === 'newest' ? db - da : da - db;
    });

    return combined;
  }, [receipts, forms, filterType, filterStatus, filterDate]);

  const categoryBreakdown = useMemo(() => {
    const approvedReceipts = receipts.filter(r => r.status === 'approved');
    const approvedForms = forms.filter(f => f.status === 'approved');
    const map = new Map<string, { total: number; count: number }>();
    approvedReceipts.forEach(r => {
      const cat = r.category || 'uncategorized';
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += r.total || 0;
      existing.count += 1;
      map.set(cat, existing);
    });
    approvedForms.forEach(f => {
      const cat = f.expense_type || 'uncategorized';
      const existing = map.get(cat) || { total: 0, count: 0 };
      existing.total += f.amount || 0;
      existing.count += 1;
      map.set(cat, existing);
    });
    return Array.from(map.entries()).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.total - a.total);
  }, [receipts, forms]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setProcessingReceipt(true);
    setUploading(true);
    setShowAddEntryModal(false);
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
  const backHref = '/officer/events';

  const handleOpenAddEntry = () => {
    setAddEntryStep('choose');
    setShowAddEntryModal(true);
  };

  const handleChooseWithReceipt = () => {
    setAddEntryStep('receipt-upload');
  };

  const handleChooseNoReceipt = () => {
    setAddEntryStep('no-receipt-form');
    setShowAddEntryModal(false);
    setShowForm(true);
  };

  const handleSuccessDone = () => {
    setShowAddEntryModal(false);
    setAddEntryStep('choose');
  };

  const handleSuccessUploadAgain = () => {
    setAddEntryStep('receipt-upload');
  };

  const handleSuccessNewForm = () => {
    setShowAddEntryModal(false);
    setAddEntryStep('choose');
    setShowForm(true);
  };

  // Mobile layout — unchanged
  if (isMobile) {
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
                                  <Trash className="h-3 w-3" />
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
                            <Trash className="h-3 w-3" />
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
                  <Image src={showOcrError.imageUrl} alt="Receipt" fill loading="eager" className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetake} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                  <Camera className="h-4 w-4 mr-2" /> Take Photo Again
                </Button>
                <Button onClick={handleRetryOcr} disabled={ocrRetrying || ocrErrorCooldown} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                  {ocrRetrying ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : <ArrowsClockwise className="h-4 w-4 mr-2" />}
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
                  <Image src={reviewImageUrl} alt="Receipt" fill loading="eager" className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
                      <Trash className="h-3 w-3" />
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
                  {confirmingReceipt ? <><Spinner className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm & Deduct from Budget'}
                </Button>
              </div>
            </div>
          )}
      </ResponsiveDialog>

      {/* Processing overlay */}
      {processingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-white p-8 shadow-lg">
            <Spinner className="h-10 w-10 animate-spin text-text-secondary" />
            <p className="text-[15px] leading-[22px] font-medium text-text-body">Please wait, analyzing receipt image...</p>
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
                  <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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

  // ==================== DESKTOP LAYOUT (>= 1024px) ====================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref} prefetch={true} className="text-text-secondary hover:text-text-primary transition-colors duration-150 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[24px] leading-[30px] font-[700] tracking-[-0.04em] text-text-primary">{event.name}</h1>
          <p className="text-[13px] leading-[18px] text-text-secondary mt-0.5">
            {formatDate(event.created_at)} &middot; {event.officer?.first_name} {event.officer?.last_name}
          </p>
        </div>
        <Badge variant={event.status === 'ongoing' ? 'warning' : 'success'} className="shrink-0">
          {event.status === 'ongoing' ? 'Ongoing' : 'Done'}
        </Badge>
      </div>

      {/* Main two-column layout */}
      <div className="flex flex-row gap-6 items-start">
        {/* LEFT PANEL (70%) */}
        <div className="flex-[7] min-w-0 space-y-5">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            {/* Tab pills */}
            <div className="inline-flex bg-surface-gray p-0.5 rounded-xl">
              <button
                onClick={() => setExpensesTab('expenses')}
                className={cn(
                  'relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300',
                  expensesTab === 'expenses'
                    ? 'bg-surface-white shadow-sm text-text-primary'
                    : 'text-text-secondary hover:text-text-body'
                )}
              >
                {expensesTab === 'expenses' && (
                  <motion.div layoutId="tab-pill-officer" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ClipboardText className="h-3.5 w-3.5" /> Expenses
                </span>
              </button>
              <button
                onClick={() => setExpensesTab('report')}
                className={cn(
                  'relative px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-all duration-300',
                  expensesTab === 'report'
                    ? 'bg-surface-white shadow-sm text-text-primary'
                    : 'text-text-secondary hover:text-text-body'
                )}
              >
                {expensesTab === 'report' && (
                  <motion.div layoutId="tab-pill-officer" className="absolute inset-0 bg-surface-white rounded-[10px] shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <ChartBar className="h-3.5 w-3.5" /> Report
                </span>
              </button>
            </div>

            <div className="flex-1" />

            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={cn(
                  'h-9 w-9 flex items-center justify-center rounded-xl transition-all duration-200',
                  showFilterDropdown ? 'bg-surface-gray text-text-primary' : 'text-text-secondary hover:bg-surface-gray hover:text-text-body'
                )}
              >
                <Funnel className="h-4 w-4" />
              </button>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-56 bg-surface-white rounded-2xl shadow-lg border border-divider/40 p-3 z-50"
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Type</p>
                      <div className="flex gap-1">
                        {(['all', 'receipt', 'no-receipt'] as const).map(t => (
                          <button key={t} onClick={() => setFilterType(t)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all', filterType === t ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
                            {t === 'all' ? 'All' : t === 'receipt' ? 'Receipt' : 'No Receipt'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Status</p>
                      <div className="flex gap-1 flex-wrap">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
                          <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterStatus === s ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Date</p>
                      <div className="flex gap-1">
                        {(['newest', 'oldest'] as const).map(d => (
                          <button key={d} onClick={() => setFilterDate(d)} className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize', filterDate === d ? 'bg-primary text-white' : 'bg-surface-gray text-text-secondary hover:text-text-body')}>
                            {d === 'newest' ? 'Newest' : 'Oldest'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Add Entry button — officer only */}
            {!isViewOnly && (
              <Button onClick={handleOpenAddEntry} className="bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md transition-all duration-300 ease-out rounded-xl h-9 px-4 text-[13px] font-medium">
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Entry
              </Button>
            )}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {expensesTab === 'expenses' ? (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {mergedExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-16 w-16 rounded-3xl bg-surface-gray flex items-center justify-center animate-breathe-subtle">
                      <ClipboardText className="h-8 w-8 text-text-placeholder" />
                    </div>
                    <p className="text-[15px] leading-[22px] text-text-secondary font-medium">No expenses yet</p>
                    <p className="text-[13px] leading-[18px] text-text-placeholder -mt-2">Add your first entry to get started.</p>
                    {!isViewOnly && (
                      <Button onClick={handleOpenAddEntry} variant="outline" className="mt-2 rounded-xl">
                        <Plus className="h-4 w-4 mr-1.5" /> Add Entry
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {mergedExpenses.map((item, index) => (
                      <motion.div
                        key={`${item._type}-${item.id}`}
                        initial={{ opacity: 0, y: 16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
                      >
                        {item._type === 'receipt' ? (
                          /* Receipt card */
                          <button onClick={() => setSelectedReceipt(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-surface-gray overflow-hidden shrink-0 relative">
                                  {item.image_url ? (
                                    <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                      <ImageIcon className="h-6 w-6 text-text-placeholder" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.vendor || 'Unknown'}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize truncate">{item.category}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.total)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && (
                                    <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </button>
                        ) : (
                          /* No-receipt card */
                          <button onClick={() => setSelectedForm(item)} className="text-left w-full group">
                            <Card className="bg-surface-white rounded-2xl shadow-soft hover:shadow-md transition-all duration-300 ease-out group-hover:-translate-y-1 overflow-hidden border border-divider/20 hover:border-primary-tint-border/50">
                              <div className="flex gap-3 p-4">
                                <div className="h-14 w-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                  <FileText className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-medium text-text-primary truncate">{item.expense_name || item.expense_type}</p>
                                    <Badge variant={item.status as any} className={cn('shrink-0 text-[10px] leading-[12px] px-1.5 py-0', item.status === 'approved' && 'bg-primary-tint-bg text-primary-tint-text border-0', item.status === 'pending' && 'bg-amber-50 text-amber-700 border-0', item.status === 'rejected' && 'bg-red-50 text-error border-0')}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-text-secondary mt-0.5 capitalize">{item.expense_type}</p>
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-[15px] font-semibold text-text-primary">{formatCurrency(item.amount)}</span>
                                    <span className="text-[10px] text-text-placeholder">{formatDate(item.created_at)}</span>
                                  </div>
                                  {item.profiles && (
                                    <p className="text-[10px] text-text-placeholder mt-1 truncate">{item.profiles.first_name} {item.profiles.last_name}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20">
                  <CardHeader className="pb-3 px-6 pt-6 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-[15px] font-[590] tracking-[-0.02em] text-text-primary">Category Breakdown</CardTitle>
                      <CardDescription className="text-[11px] text-text-secondary mt-0.5">Approved expenses by category</CardDescription>
                    </div>
                    <Link href={`/officer/reports/${eventId}`} prefetch={true}>
                      <Button variant="outline" size="sm" className="rounded-xl text-[11px] h-8">
                        <FileText className="h-3.5 w-3.5 mr-1" /> Report
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <CategoryBarChart data={categoryBreakdown} />
                    {categoryBreakdown.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-text-secondary">Total Approved</span>
                          <span className="font-semibold text-text-primary">{formatCurrency(categoryBreakdown.reduce((s, c) => s + c.total, 0))}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDEBAR (30%) — sticky */}
        <div className="flex-[3] hidden lg:block sticky top-24 self-start">
          <div className="space-y-5 animate-slide-in-right">
            {/* Donut + Stats */}
            <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <BudgetChart used={totalExpenses} remaining={event?.budget || 0} size={160} />
                  <div className="w-full mt-5 grid grid-cols-3 divide-x divide-divider/60">
                    <div className="text-center pr-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Total</p>
                      <AnimatedCurrency value={totalExpenses + (event?.budget || 0)} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center px-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Spent</p>
                      <AnimatedCurrency value={totalExpenses} className="text-[14px] font-semibold text-text-primary leading-tight block mt-0.5" />
                    </div>
                    <div className="text-center pl-2">
                      <p className="text-[9px] font-semibold text-text-secondary uppercase tracking-wider">Remain</p>
                      <AnimatedCurrency value={event?.budget || 0} className={cn('text-[14px] font-semibold leading-tight block mt-0.5', (event?.budget || 0) < 0 ? 'text-error' : 'text-text-primary')} />
                    </div>
                  </div>
                  {(event?.budget || 0) < 0 && (
                    <div className="mt-3 w-full px-3 py-1.5 bg-red-50 rounded-xl text-[10px] font-medium text-error text-center">
                      Budget exceeded by {formatCurrency(Math.abs(event?.budget || 0))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mini KPI cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-primary-tint-bg flex items-center justify-center">
                        <ReceiptIcon className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Receipts</span>
                    </div>
                    <AnimatedCount value={receipts.length} className="text-[22px] font-serif font-bold tracking-tight text-text-primary" />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}>
                <Card className="bg-surface-white rounded-2xl shadow-soft border border-divider/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-lg bg-amber-50 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-amber-600" />
                      </div>
                      <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">No-Rcpt</span>
                    </div>
                    <AnimatedCount value={forms.length} className="text-[22px] font-serif font-bold tracking-tight text-text-primary" />
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== SHARED MODALS (desktop) ==================== */}

      {/* Add Entry Modal — officer only */}
      <ResponsiveDialog open={showAddEntryModal} onOpenChange={(open) => { if (!open) { setShowAddEntryModal(false); setAddEntryStep('choose'); } }} title={addEntryStep === 'success' ? 'Entry Submitted!' : 'Add Entry'} description={addEntryStep === 'choose' ? 'Choose how you want to add an expense entry.' : ''}>
        {addEntryStep === 'choose' && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <button
              onClick={handleChooseWithReceipt}
              className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-divider hover:border-primary hover:bg-primary-tint-bg/30 transition-all duration-300 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary-tint-bg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ReceiptIcon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-[15px] font-medium text-text-primary">With Receipt</span>
              <span className="text-[11px] text-text-secondary text-center">Upload a photo or image of the official receipt</span>
            </button>
            <button
              onClick={handleChooseNoReceipt}
              className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-divider hover:border-primary hover:bg-primary-tint-bg/30 transition-all duration-300 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-7 w-7 text-amber-600" />
              </div>
              <span className="text-[15px] font-medium text-text-primary">No Receipt</span>
              <span className="text-[11px] text-text-secondary text-center">Submit a form for expenses without a receipt</span>
            </button>
          </div>
        )}

        {addEntryStep === 'receipt-upload' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-primary scale-[1.01] bg-primary-tint-bg/30' : 'border-divider hover:border-primary hover:bg-surface-gray/50'}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-text-placeholder" />
              <p className="text-[15px] leading-[22px] text-text-placeholder">
                {isDragActive ? 'Drop receipt here' : 'Drop receipt image or click to browse'}
              </p>
              <p className="text-[13px] leading-[18px] text-text-placeholder">PNG, JPG, JPEG, WEBP</p>
            </div>
          </div>
        )}

        {addEntryStep === 'success' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-primary-tint-bg flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-[17px] font-[590] text-text-primary">
              {successType === 'receipt' ? 'Receipt uploaded!' : 'Form submitted!'}
            </p>
            <p className="text-[13px] text-text-secondary text-center -mt-2">
              {successType === 'receipt'
                ? 'The receipt has been submitted for review.'
                : 'The no-receipt form has been submitted for review.'
              }
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={handleSuccessUploadAgain} className="rounded-xl">
                <Upload className="h-4 w-4 mr-1.5" /> Upload Receipt
              </Button>
              <Button variant="outline" onClick={handleSuccessNewForm} className="rounded-xl">
                <FileText className="h-4 w-4 mr-1.5" /> No-Receipt Form
              </Button>
              <Button onClick={handleSuccessDone} className="bg-primary text-white hover:bg-primary-hover rounded-xl">
                Done
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* No-Receipt Form Dialog (desktop) */}
      {!isViewOnly && (
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
                          <Trash className="h-3 w-3" />
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
                    <Trash className="h-3 w-3" />
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
      )}

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

      {/* OCR Error Dialog */}
      <ResponsiveDialog open={!!showOcrError} onOpenChange={(open) => { if (!open) setShowOcrError(null); }} title="We couldn't read the receipt right now" description="The receipt image could not be read. Try taking a clearer photo with better lighting, or tap Retry to try again.">
        {showOcrError && (
          <div className="space-y-4">
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-surface-gray">
              <Image src={showOcrError.imageUrl} alt="Receipt" fill loading="eager" className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleRetake} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                <Camera className="h-4 w-4 mr-2" /> Take Photo Again
              </Button>
              <Button onClick={handleRetryOcr} disabled={ocrRetrying || ocrErrorCooldown} className="bg-primary text-white hover:bg-primary/90 transition-all duration-300 ease-out">
                {ocrRetrying ? <Spinner className="h-4 w-4 mr-2 animate-spin" /> : <ArrowsClockwise className="h-4 w-4 mr-2" />}
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
                <Image src={reviewImageUrl} alt="Receipt" fill loading="eager" className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
                    <Trash className="h-3 w-3" />
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
                {confirmingReceipt ? <><Spinner className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Confirm & Deduct from Budget'}
              </Button>
            </div>
          </div>
        )}
      </ResponsiveDialog>

      {/* Processing overlay */}
      {processingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-white p-8 shadow-lg">
            <Spinner className="h-10 w-10 animate-spin text-text-secondary" />
            <p className="text-[15px] leading-[22px] font-medium text-text-body">Please wait, analyzing receipt image...</p>
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
                  <Image src={selectedReceipt.image_url} alt="Receipt" fill loading="eager" className="rounded-xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
