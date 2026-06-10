'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { getEvent, getReceipts, getNoReceiptForms, uploadReceipt, confirmReceipt, submitNoReceiptForm, resubmitNoReceiptForm, retryOcr } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ArrowLeft, Upload, Receipt as ReceiptIcon, FileText, CheckCircle, XCircle, Clock, Wallet, Image as ImageIcon, Plus, Trash2, Shield, Download, ChevronRight, Eye, Camera, Loader2, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraCapture } from '@/components/camera/camera-capture';
import { UploadSheet } from '@/components/camera/upload-sheet';
import type { Event, Receipt, NoReceiptForm } from '@/types';

const COLORS = ['#0a0a0a', '#e5e5e5', '#22c55e'];

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const [eventId, setEventId] = useState<string>('');
  const [event, setEvent] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const profile = useAuthStore(s => s.profile);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    const init = async () => {
      const p = await params;
      setEventId(p.eventId);

      const [eventData, receiptsData, formsData] = await Promise.all([
        getEvent(p.eventId),
        getReceipts(p.eventId),
        getNoReceiptForms(p.eventId),
      ]);

      setEvent(eventData);
      setReceipts(receiptsData);
      setForms(formsData);

      setLoading(false);
    };
    init();
  }, [params]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    setUploadSource('file');
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('file', file);

    // Quick quality check — warn if image is likely too small or blurry
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
    } catch {
      // If we can't check dimensions, proceed anyway
    }

    try {
      const result = await uploadReceipt(eventId, formData);
      setReviewImageUrl(result.imageUrl);

      if (result.ocrFailed || !result.parsed) {
        setShowOcrError({ imageUrl: result.imageUrl });
      } else {
        setReviewParsed(result.parsed);
        setEditingReceipt(result.parsed);
        setReviewReceipt(true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload receipt');
    }
    setUploading(false);
  }, [eventId]);

  const handleConfirmReceipt = async () => {
    if (!editingReceipt) return;
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
    }
  };

  const handleCameraCapture = useCallback(async (file: File) => {
    setShowCamera(false);
    setUploading(true);
    setUploadSource('camera');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await uploadReceipt(eventId, formData);
      setReviewImageUrl(result.imageUrl);

      if (result.ocrFailed || !result.parsed) {
        setShowOcrError({ imageUrl: result.imageUrl });
      } else {
        setReviewParsed(result.parsed);
        setEditingReceipt(result.parsed);
        setReviewReceipt(true);
      }
    } catch (err: any) {
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
  const budgetData = event ? [
    { name: 'Used', value: totalExpenses },
    { name: 'Remaining', value: event.budget },
  ] : [];

  // Receipt KPIs
  const approvedReceipts = receipts.filter(r => r.status === 'approved').length;
  const pendingReceipts = receipts.filter(r => r.status === 'pending').length;
  const rejectedReceipts = receipts.filter(r => r.status === 'rejected').length;

  // Form KPIs
  const approvedForms = forms.filter(f => f.status === 'approved').length;
  const pendingForms = forms.filter(f => f.status === 'pending').length;
  const rejectedForms = forms.filter(f => f.status === 'rejected').length;

  const handleSubmitForm = async () => {
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
    }
  };

  const handleResubmit = async () => {
    if (!resubmitTarget || !resubmitExplanation.trim()) {
      toast.error('Please provide an explanation');
      return;
    }
    try {
      await resubmitNoReceiptForm(resubmitTarget.id, eventId, resubmitExplanation);
      toast.success('Form resubmitted for review');
      setResubmitTarget(null);
      setResubmitExplanation('');
      const f = await getNoReceiptForms(eventId);
      setForms(f);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resubmit form');
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

  const isViewOnly = event.status === 'done';
  const report = null; // Will be fetched

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/officer/events" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
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

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget Overview */}
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
                      {budgetData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx]} />
                      ))}
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

        {/* Receipt KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-3">{receipts.length}</div>
            <div className="flex gap-3 text-xs">
              <Badge variant="approved">{approvedReceipts} Approved</Badge>
              <Badge variant="pending">{pendingReceipts} Pending</Badge>
              <Badge variant="rejected">{rejectedReceipts} Rejected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* No-Receipt KPIs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">No-Receipt Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold mb-3">{forms.length}</div>
            <div className="flex gap-3 text-xs">
              <Badge variant="approved">{approvedForms} Approved</Badge>
              <Badge variant="pending">{pendingForms} Pending</Badge>
              <Badge variant="rejected">{rejectedForms} Rejected</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="receipts">
        <TabsList>
          <TabsTrigger value="receipts" className="flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4" /> Receipts
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> No-Receipt Forms
          </TabsTrigger>
        </TabsList>

        {/* Receipts Tab */}
        <TabsContent value="receipts" className="space-y-4">
          {!isViewOnly && (
            <>
              {/* Desktop dropzone */}
              <div {...getRootProps()} className="hidden lg:block border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-neutral-500 transition-colors">
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {isDragActive ? 'Drop receipt here' : 'Drop receipt image or click to upload'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">PNG, JPG, JPEG, WEBP</p>
              </div>

              {/* Mobile upload button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowUploadSheet(true)}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center hover:border-neutral-500 transition-colors disabled:opacity-50"
                >
                  <Camera className="h-6 w-6 text-neutral-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Upload Receipt</p>
                    <p className="text-xs text-neutral-400">Take a photo or browse files</p>
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

          {receipts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-sm text-neutral-500">
                No receipts uploaded yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {receipts.map((receipt) => (
                <button key={receipt.id} onClick={() => setSelectedReceipt(receipt)} className="text-left">
                  <Card className="hover:shadow-md transition-all">
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
                            <Badge variant={receipt.status as any} className="text-[10px] px-1.5 py-0">
                              {receipt.status}
                            </Badge>
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

        {/* No-Receipt Forms Tab */}
        <TabsContent value="forms" className="space-y-4">
          {!isViewOnly && (
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New No-Receipt Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>No-Receipt Form</DialogTitle>
                  <DialogDescription>
                    Submit an expense without a receipt
                  </DialogDescription>
                </DialogHeader>

                {formStep === 1 && (
                  <div className="space-y-4">
                    <Label>Expense Type</Label>
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
                          className="flex flex-col items-center gap-2 p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formStep === 2 && expenseType && (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setFormStep(1)} className="mb-2">
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>

                    <div className="space-y-2">
                      <Label>Activity/Event Name</Label>
                      <Input value={formData.expense_name || ''} onChange={e => setFormData({...formData, expense_name: e.target.value})} placeholder="e.g., Team building lunch" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Incurred</Label>
                      <Input type="date" value={formData.date_incurred || ''} onChange={e => setFormData({...formData, date_incurred: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Brief Description</Label>
                      <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the expense..." />
                    </div>

                    {/* Type-specific fields */}
                    {expenseType === 'transport' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Mode of Transport</Label>
                            <Input value={formData.mode || ''} onChange={e => setFormData({...formData, mode: e.target.value})} placeholder="e.g., Jeepney" />
                          </div>
                          <div className="space-y-2">
                            <Label>Route</Label>
                            <Input value={formData.route || ''} onChange={e => setFormData({...formData, route: e.target.value})} placeholder="e.g., SM to Campus" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Fare per Person</Label>
                            <Input type="number" value={formData.fare_per_person || ''} onChange={e => setFormData({...formData, fare_per_person: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>No. of Trips</Label>
                            <Input type="number" value={formData.trips || ''} onChange={e => setFormData({...formData, trips: Number(e.target.value)})} />
                            <p className="text-[10px] text-neutral-400">Round trip = 2 trips</p>
                          </div>
                        </div>
                      </>
                    )}

                    {expenseType === 'food' && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Meal Type</Label>
                            <Input value={formData.meal_type || ''} onChange={e => setFormData({...formData, meal_type: e.target.value})} placeholder="e.g., Lunch" />
                          </div>
                          <div className="space-y-2">
                            <Label>Vendor/Stall</Label>
                            <Input value={formData.vendor || ''} onChange={e => setFormData({...formData, vendor: e.target.value})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Cost per Person</Label>
                            <Input type="number" value={formData.cost_per_person || ''} onChange={e => setFormData({...formData, cost_per_person: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>No. of Meals</Label>
                            <Input type="number" value={formData.meals || ''} onChange={e => setFormData({...formData, meals: Number(e.target.value)})} />
                          </div>
                        </div>
                      </>
                    )}

                    {expenseType === 'supplies' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Items</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, items: [...(formData.items || []), { item_name: '', unit_cost: 0, qty: 1, total: 0 }]})}>
                            <Plus className="h-3 w-3 mr-1" /> Add Item
                          </Button>
                        </div>
                        {(formData.items || []).map((item: any, i: number) => (
                          <div key={i} className="grid grid-cols-4 gap-2 items-end">
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Item Name</Label>
                              <Input size={1} value={item.item_name} onChange={e => {
                                const items = [...(formData.items || [])];
                                items[i].item_name = e.target.value;
                                setFormData({...formData, items});
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Unit Cost</Label>
                              <Input type="number" value={item.unit_cost || ''} onChange={e => {
                                const items = [...(formData.items || [])];
                                items[i].unit_cost = Number(e.target.value);
                                items[i].total = items[i].unit_cost * items[i].qty;
                                setFormData({...formData, items});
                              }} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">QTY</Label>
                              <div className="flex gap-1">
                                <Input type="number" value={item.qty || 1} onChange={e => {
                                  const items = [...(formData.items || [])];
                                  items[i].qty = Number(e.target.value);
                                  items[i].total = items[i].unit_cost * items[i].qty;
                                  setFormData({...formData, items});
                                }} />
                                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => {
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
                            <Label>Service Type</Label>
                            <Input value={formData.service_type || ''} onChange={e => setFormData({...formData, service_type: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Vendor Name</Label>
                            <Input value={formData.vendor_name || ''} onChange={e => setFormData({...formData, vendor_name: e.target.value})} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label>Rate</Label>
                            <Input type="number" value={formData.rate || ''} onChange={e => setFormData({...formData, rate: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>No. of Persons</Label>
                            <Input type="number" value={formData.persons || ''} onChange={e => setFormData({...formData, persons: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration</Label>
                            <div className="flex gap-1">
                              <Input type="number" value={formData.duration || ''} onChange={e => setFormData({...formData, duration: Number(e.target.value)})} />
                              <select className="h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs px-1" value={formData.duration_unit || 'days'} onChange={e => setFormData({...formData, duration_unit: e.target.value})}>
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
                        <Label>Expense Name</Label>
                        <Input value={formData.expense_name || ''} onChange={e => setFormData({...formData, expense_name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Unit Cost</Label>
                            <Input type="number" value={formData.unit_cost || ''} onChange={e => setFormData({...formData, unit_cost: Number(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input type="number" value={formData.qty || 1} onChange={e => setFormData({...formData, qty: Number(e.target.value)})} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Formula Breakdown */}
                    {(expenseType === 'transport' || expenseType === 'food' || expenseType === 'labor') && (
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1">Formula Breakdown</p>
                        {expenseType === 'transport' && (
                          <p className="text-neutral-600 dark:text-neutral-400">
                            ₱{(formData.fare_per_person || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.trips || 0} trips = <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency((formData.fare_per_person || 0) * (formData.persons || 0) * (formData.trips || 0))}</span>
                          </p>
                        )}
                        {expenseType === 'food' && (
                          <p className="text-neutral-600 dark:text-neutral-400">
                            ₱{(formData.cost_per_person || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.meals || 0} meals = <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency((formData.cost_per_person || 0) * (formData.persons || 0) * (formData.meals || 0))}</span>
                          </p>
                        )}
                        {expenseType === 'labor' && (
                          <p className="text-neutral-600 dark:text-neutral-400">
                            ₱{(formData.rate || 0).toFixed(2)} × {formData.persons || 0} persons × {formData.duration || 0} {formData.duration_unit || 'days'} = <span className="font-semibold text-neutral-900 dark:text-white">{formatCurrency((formData.rate || 0) * (formData.persons || 0) * (formData.duration || 0))}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {expenseType === 'supplies' && (
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1">Total: {formatCurrency((formData.items || []).reduce((sum: number, i: any) => sum + (i.unit_cost || 0) * (i.qty || 0), 0))}</p>
                      </div>
                    )}

                    {expenseType === 'other' && (
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 text-sm">
                        <p className="font-medium mb-1">Total: {formatCurrency((formData.unit_cost || 0) * (formData.qty || 1))}</p>
                      </div>
                    )}

                    <Separator />
                    <Button type="button" variant="secondary" onClick={() => setFormStep(3)}>
                      Next: Witnesses & Certification
                    </Button>
                  </div>
                )}

                {formStep === 3 && (
                  <div className="space-y-4">
                    <Button variant="ghost" size="sm" onClick={() => setFormStep(2)} className="mb-2">
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>

                    {/* Witnesses */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Witnesses</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({...formData, witnesses: [...(formData.witnesses || []), { name: '', role: '' }]})}>
                          <Plus className="h-3 w-3 mr-1" /> Add Witness
                        </Button>
                      </div>
                      {(formData.witnesses || []).map((w: any, i: number) => (
                        <div key={i} className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Full Name</Label>
                            <Input value={w.name} onChange={e => {
                              const ws = [...formData.witnesses];
                              ws[i].name = e.target.value;
                              setFormData({...formData, witnesses: ws});
                            }} placeholder="Full name of witness" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Role/Position (optional)</Label>
                            <Input value={w.role || ''} onChange={e => {
                              const ws = [...formData.witnesses];
                              ws[i].role = e.target.value;
                              setFormData({...formData, witnesses: ws});
                            }} placeholder="e.g., Class president" />
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 mb-0" onClick={() => setFormData({...formData, witnesses: formData.witnesses.filter((_: any, idx: number) => idx !== i)})}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Certification */}
                    <label className="flex items-start gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                      <input type="checkbox" className="mt-1 h-4 w-4" checked={formData.certification || false} onChange={e => setFormData({...formData, certification: e.target.checked})} />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        I certify that the above is true and correct and that no receipt was issued for this expense.
                      </span>
                    </label>

                    <Button onClick={handleSubmitForm} disabled={!formData.certification} className="w-full">
                      Submit for Review
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          {forms.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-sm text-neutral-500">
                No no-receipt forms yet
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => (
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
                          <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                            <span>{formatCurrency(form.amount)}</span>
                            <span>{form.expense_type}</span>
                            <span>{formatDate(form.created_at)}</span>
                          </div>
                          {form.rejection_reason && (
                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
Rejection reason: <span className="min-w-0 break-words">{form.rejection_reason}</span>
                          </div>
                        )}
                        {form.rejection_reason && form.status === 'pending' && (
                          <Button size="sm" variant="outline" className="mt-2" onClick={(e) => { e.stopPropagation(); setResubmitTarget(form); setResubmitExplanation(''); }}>
                            Resubmit with Explanation
                          </Button>
                        )}
                        </div>
                        {form.transaction_hash && (
                          <Badge variant="success" className="flex items-center gap-1 text-[10px]">
                            <Shield className="h-3 w-3" /> Verified
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Resubmit Dialog */}
      <Dialog open={!!resubmitTarget} onOpenChange={(open) => { if (!open) { setResubmitTarget(null); setResubmitExplanation(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resubmit No-Receipt Form</DialogTitle>
            <DialogDescription>
              Provide an explanation for why this expense should be approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {resubmitTarget?.rejection_reason && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                Previous rejection reason: {resubmitTarget.rejection_reason}
              </div>
            )}
            <div className="space-y-2">
              <Label>Your Explanation</Label>
              <Textarea
                value={resubmitExplanation}
                onChange={e => setResubmitExplanation(e.target.value)}
                placeholder="Explain why this expense should be reconsidered..."
                rows={4}
              />
            </div>
            <Button className="w-full" onClick={handleResubmit} disabled={!resubmitExplanation.trim()}>
              Submit Explanation
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

      {/* Financial Report Section */}
      {receipts.filter(r => r.status === 'approved').length > 0 || forms.filter(f => f.status === 'approved').length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/officer/reports/${eventId}`}>
              <Button variant="secondary">
                <FileText className="h-4 w-4 mr-2" /> View Financial Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* OCR Error Dialog */}
      <Dialog open={!!showOcrError} onOpenChange={(open) => { if (!open) setShowOcrError(null); }}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>We couldn't read the receipt right now</DialogTitle>
            <DialogDescription>
              The receipt image could not be read. Try taking a clearer photo with better lighting, or tap Retry to try again.
            </DialogDescription>
          </DialogHeader>
          {showOcrError && (
            <div className="space-y-4">
              <div className="relative w-full h-36 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                <Image src={showOcrError.imageUrl} alt="Receipt" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetake}>
                  <Camera className="h-4 w-4 mr-2" /> Take Photo Again
                </Button>
                <Button onClick={handleRetryOcr} disabled={ocrRetrying || ocrErrorCooldown}>
                  {ocrRetrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {ocrRetrying ? 'Reading receipt...' : ocrErrorCooldown ? 'Please wait...' : 'Retry OCR'}
                </Button>
                <Button variant="outline" onClick={handleEnterManually}>
                  <FileText className="h-4 w-4 mr-2" /> Enter Manually
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Review Modal */}
      <Dialog open={!!reviewReceipt} onOpenChange={(open) => { if (!open) { setReviewReceipt(false); setEditingReceipt(null); } }}>
        <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reviewParsed ? 'Review Receipt Data' : 'Manual Receipt Entry'}</DialogTitle>
            <DialogDescription>
              {reviewParsed ? 'Verify the OCR-parsed data below and confirm to deduct from budget.' : 'OCR parsing failed. Please fill in the receipt details manually.'}
            </DialogDescription>
          </DialogHeader>
          {editingReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative w-full h-48">
                  <Image src={reviewImageUrl} alt="Receipt" fill className="rounded-lg object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Vendor / Store Name</Label>
                    <Input value={editingReceipt.vendor || ''} onChange={e => setEditingReceipt({...editingReceipt, vendor: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">SI/OR Number</Label>
                      <Input value={editingReceipt.si_or_number || ''} onChange={e => setEditingReceipt({...editingReceipt, si_or_number: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Input value={editingReceipt.category || ''} onChange={e => setEditingReceipt({...editingReceipt, category: e.target.value})} placeholder="e.g., Hardware, Office Supplies" />
                      {editingReceipt.category_reasoning && (
                        <p className="text-[10px] text-neutral-400 mt-0.5 italic">OCR: {editingReceipt.category_reasoning}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input value={editingReceipt.date || ''} onChange={e => setEditingReceipt({...editingReceipt, date: e.target.value})} placeholder="MM/DD/YYYY" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input value={editingReceipt.time || ''} onChange={e => setEditingReceipt({...editingReceipt, time: e.target.value})} placeholder="HH:MM" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Line Items</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReceipt({...editingReceipt, items: [...(editingReceipt.items || []), { name: '', qty: 1, unit_price: 0, total: 0 }]})}>
                    <Plus className="h-3 w-3 mr-1" /> Add Item
                  </Button>
                </div>
                {(editingReceipt.items || []).map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px]">Item</Label>
                      <Input size={1} value={item.name} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].name = e.target.value;
                        setEditingReceipt({...editingReceipt, items});
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">QTY</Label>
                      <Input type="number" value={item.qty || 1} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].qty = Number(e.target.value);
                        items[i].total = items[i].qty * (items[i].unit_price || 0);
                        setEditingReceipt({...editingReceipt, items});
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Price</Label>
                      <Input type="number" value={item.unit_price || 0} onChange={e => {
                        const items = [...(editingReceipt.items || [])];
                        items[i].unit_price = Number(e.target.value);
                        items[i].total = items[i].qty * items[i].unit_price;
                        setEditingReceipt({...editingReceipt, items});
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditingReceipt({...editingReceipt, items: editingReceipt.items.filter((_: any, idx: number) => idx !== i)})}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {(editingReceipt.subtotal !== undefined || editingReceipt.discount !== undefined) && (
                <div className="space-y-1 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(editingReceipt.subtotal || 0)}</span>
                  </div>
                  {editingReceipt.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>Discount</span>
                      <span>-{formatCurrency(editingReceipt.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-neutral-200 dark:border-neutral-700 pt-1 mt-1">
                    <span>Amount Due (OCR)</span>
                    <span>{formatCurrency(editingReceipt.total || 0)}</span>
                  </div>
                  {editingReceipt.discount > 0 && (
                    <p className="text-[10px] text-neutral-400 mt-1">Total above is the final amount due. Verify the line item totals below match.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg">
                <span className="text-sm font-medium">Total from Items</span>
                <span className="text-lg font-bold">
                  {formatCurrency((editingReceipt.items || []).reduce((sum: number, i: any) => sum + (i.total || 0), 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setReviewReceipt(false); setEditingReceipt(null); }}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmReceipt}>
                  Confirm & Deduct from Budget
                </Button>
              </div>
            </div>
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
