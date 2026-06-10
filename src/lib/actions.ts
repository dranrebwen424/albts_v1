'use server';

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseReceipt } from '@/lib/openrouter/client';
import { recordHash, generateHash } from '@/lib/blockchain/client';
import { sendEmail } from '@/lib/email/client';
import { formatCurrency } from '@/lib/utils/format';
import { revalidatePath } from 'next/cache';

async function createAuditLog(departmentId: string, action: string, details?: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const adminClient = createAdminClient();
  await adminClient.from('audit_logs').insert({
    admin_id: user.id,
    department_id: departmentId,
    action,
    details: details || {},
  });
}

// ─── Departments ───

export const getDepartments = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from('departments').select('*').order('name');
  return data || [];
});

export async function createDepartment(name: string, code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('departments').insert({ name, code }).select().single();
  if (error) throw new Error(error.message);
  await createAuditLog(data.id, 'Department created', { department_name: name, department_code: code });
  revalidatePath('/admin/departments');
  return data;
}

// ─── Events ───

export const getEvents = cache(async (departmentId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*, officer:profiles!events_officer_id_fkey(first_name, last_name)')
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false });
  return data || [];
});

export const getEvent = cache(async (eventId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('*, officer:profiles!events_officer_id_fkey(first_name, last_name), adviser:profiles!events_adviser_id_fkey(first_name, last_name)')
    .eq('id', eventId)
    .single();
  return data;
});

export async function createEvent(
  departmentId: string,
  name: string,
  officerId: string,
  adviserId: string,
  budget: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Only officers can create events
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'officer') {
    throw new Error('Only officers can create events');
  }

  const { data, error } = await supabase
    .from('events')
    .insert({ department_id: departmentId, name, officer_id: officerId, adviser_id: adviserId, budget })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/officer/events`);
  return data;
}

export async function markEventDone(eventId: string, departmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('events')
    .update({ status: 'done' })
    .eq('id', eventId);
  if (error) throw new Error(error.message);

  // Notify adviser
  const event = await getEvent(eventId);
  if (event?.adviser_id) {
    await supabase.from('notifications').insert({
      user_id: event.adviser_id,
      title: 'Event Completed',
      message: `Event "${event.name}" has been marked as done.`,
      type: 'event_done',
      event_id: eventId,
    });
  }

  await createAuditLog(departmentId, 'Event marked as done', { event_id: eventId, event_name: event?.name });
  revalidatePath(`/officer/events/${eventId}`);
  return true;
}

// ─── Receipts ───

export const getReceipts = cache(async (eventId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('receipts')
    .select('*, profiles(first_name, last_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  return data || [];
});

export async function uploadReceipt(
  eventId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const file = formData.get('file') as File;
  if (!file) throw new Error('No file provided');

  // Upload image to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${eventId}/${crypto.randomUUID()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file);

  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);

  // Convert image to base64 for OCR
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  // Parse receipt via OpenRouter
  try {
    const parsed = await parseReceipt(base64, file.type);
    return { success: true, imageUrl: publicUrl, parsed, ocrFailed: false };
  } catch {
    return { success: true, imageUrl: publicUrl, parsed: null, ocrFailed: true };
  }
}

export async function retryOcr(eventId: string, imageUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  try {
    const parsed = await parseReceipt(base64, blob.type);
    return { parsed, ocrFailed: false };
  } catch {
    return { parsed: null, ocrFailed: true };
  }
}

export async function confirmReceipt(
  eventId: string,
  data: {
    image_url: string;
    vendor: string;
    si_or_number: string;
    date: string;
    time: string;
    items: { name: string; qty: number; unit_price: number; total: number }[];
    total: number;
    category: string;
    confidence: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: event } = await supabase
    .from('events')
    .select('budget, department_id, name')
    .eq('id', eventId)
    .single();

  if (!event) throw new Error('Event not found');

  // Deduct from budget
  const { error: budgetError } = await supabase
    .from('events')
    .update({ budget: event.budget - data.total })
    .eq('id', eventId);

  if (budgetError) throw new Error(budgetError.message);

  // Create receipt as approved
  const { data: receipt, error } = await supabase
    .from('receipts')
    .insert({
      event_id: eventId,
      uploaded_by: user.id,
      vendor: data.vendor,
      si_or_number: data.si_or_number,
      date: data.date,
      time: data.time,
      items: data.items,
      total: data.total,
      category: data.category,
      confidence: data.confidence,
      image_url: data.image_url,
      status: 'approved',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Record on blockchain
  try {
    const dataHash = generateHash({
      id: receipt.id,
      vendor: data.vendor,
      total: data.total,
      type: 'receipt',
    });
    const { txHash, blockRef } = await recordHash(dataHash);
    if (txHash) {
      await supabase.from('receipts').update({ transaction_hash: txHash, block_ref: blockRef }).eq('id', receipt.id);
    }
  } catch {}

  await createAuditLog(event.department_id, 'Receipt confirmed', {
    event_id: eventId,
    event_name: event.name,
    vendor: data.vendor,
    total: data.total,
    receipt_id: receipt.id,
  });
  revalidatePath(`/officer/events/${eventId}`);
  await checkBudgetThreshold(eventId);
  return receipt;
}

export async function approveReceipt(receiptId: string, eventId: string) {
  const supabase = await createClient();
  const { data: receipt } = await supabase
    .from('receipts')
    .select('*, events!inner(budget, department_id)')
    .eq('id', receiptId)
    .single();

  if (!receipt) throw new Error('Receipt not found');

  // Deduct from budget
  const currentBudget = (receipt.events as any).budget;
  const newBudget = currentBudget - receipt.total;

  if (newBudget < 0) throw new Error('Insufficient budget');

  const { error: budgetError } = await supabase
    .from('events')
    .update({ budget: newBudget })
    .eq('id', eventId);

  if (budgetError) throw new Error(budgetError.message);

  // Update receipt status
  const { error } = await supabase
    .from('receipts')
    .update({ status: 'approved' })
    .eq('id', receiptId);

  if (error) throw new Error(error.message);

  await createAuditLog((receipt.events as any).department_id, 'Receipt approved', {
    event_id: eventId,
    vendor: receipt.vendor,
    total: receipt.total,
    receipt_id: receiptId,
  });

  // Record on blockchain
  try {
    const dataHash = generateHash({
      id: receiptId,
      vendor: receipt.vendor,
      total: receipt.total,
      type: 'receipt',
    });
    const { txHash, blockRef } = await recordHash(dataHash);
    await supabase.from('receipts').update({ transaction_hash: txHash, block_ref: blockRef }).eq('id', receiptId);
  } catch (blockchainError) {
    console.error('Blockchain recording failed:', blockchainError);
  }

  revalidatePath(`/officer/events/${eventId}`);
  return true;
}

export async function rejectReceipt(receiptId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('receipts')
    .update({ status: 'rejected' })
    .eq('id', receiptId);
  if (error) throw new Error(error.message);
  revalidatePath(`/officer/events/${eventId}`);
  return true;
}

// ─── No-Receipt Forms ───

export const getNoReceiptForms = cache(async (eventId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('no_receipt_forms')
    .select('*, profiles(first_name, last_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  return data || [];
});

export const getPendingForms = cache(async (departmentId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('no_receipt_forms')
    .select('*, events!inner(name, department_id), profiles(first_name, last_name)')
    .eq('events.department_id', departmentId)
    .eq('status', 'pending')
    .is('rejection_reason', null)
    .order('created_at', { ascending: false });
  return data || [];
});

export const getWaitingForms = cache(async (departmentId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('no_receipt_forms')
    .select('*, events!inner(name, department_id), profiles(first_name, last_name)')
    .eq('events.department_id', departmentId)
    .eq('status', 'pending')
    .not('rejection_reason', 'is', null)
    .order('created_at', { ascending: false });
  return data || [];
});

export async function submitNoReceiptForm(formData: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await supabase
    .from('no_receipt_forms')
    .insert({
      ...formData,
      submitted_by: user.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Notify adviser
  const event = await getEvent(formData.event_id);
  if (event?.adviser_id) {
    await supabase.from('notifications').insert({
      user_id: event.adviser_id,
      title: 'New No-Receipt Form',
      message: `A new no-receipt form "${formData.expense_name}" has been submitted for "${event.name}".`,
      type: 'form_submitted',
      event_id: formData.event_id,
    });
  }

  await createAuditLog(event.department_id, 'No-receipt form submitted', {
    event_id: formData.event_id,
    event_name: event.name,
    form_id: data.id,
    expense_name: formData.expense_name,
    amount: data.amount,
  });

  revalidatePath(`/officer/events/${formData.event_id}`);
  return data;
}

export async function approveNoReceiptForm(formId: string, eventId: string) {
  const supabase = await createClient();
  const { data: form } = await supabase
    .from('no_receipt_forms')
    .select('*, events!inner(budget, department_id, name)')
    .eq('id', formId)
    .single();

  if (!form) throw new Error('Form not found');

  // Deduct from budget
  const currentBudget = (form.events as any).budget;
  const newBudget = currentBudget - form.amount;

  const { error: budgetError } = await supabase
    .from('events')
    .update({ budget: newBudget })
    .eq('id', eventId);

  if (budgetError) throw new Error(budgetError.message);

  // Update form status
  const { error } = await supabase
    .from('no_receipt_forms')
    .update({ status: 'approved' })
    .eq('id', formId);

  if (error) throw new Error(error.message);

  // Notify officer
  await supabase.from('notifications').insert({
    user_id: form.submitted_by,
    title: 'Form Approved',
    message: `Your no-receipt form "${form.expense_name}" has been approved.`,
    type: 'form_approved',
    event_id: eventId,
  });

  // Record on blockchain
  try {
    const dataHash = generateHash({
      id: formId,
      expense_name: form.expense_name,
      amount: form.amount,
      type: 'no_receipt',
    });
    const { txHash, blockRef } = await recordHash(dataHash);
    await supabase.from('no_receipt_forms').update({ transaction_hash: txHash, block_ref: blockRef }).eq('id', formId);
  } catch (blockchainError) {
    console.error('Blockchain recording failed:', blockchainError);
  }

  revalidatePath(`/adviser/pending`);
  revalidatePath(`/officer/events/${eventId}`);
  await checkBudgetThreshold(eventId);
  await createAuditLog((form.events as any).department_id, 'No-receipt form approved', {
    event_id: eventId,
    event_name: (form.events as any).name,
    form_id: formId,
    expense_name: form.expense_name,
    amount: form.amount,
  });
  return true;
}

async function checkBudgetThreshold(eventId: string) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from('events')
    .select('id, name, budget, adviser_id, department_id')
    .eq('id', eventId)
    .single();

  if (!event || !event.adviser_id || event.budget <= 0) return;

  const [receiptsRes, formsRes] = await Promise.all([
    supabase.from('receipts').select('total').eq('event_id', eventId).eq('status', 'approved'),
    supabase.from('no_receipt_forms').select('amount').eq('event_id', eventId).eq('status', 'approved'),
  ]);

  const totalExpenses = [
    ...(receiptsRes.data || []),
    ...(formsRes.data || []),
  ].reduce((sum: number, item: any) => sum + (item.total || item.amount || 0), 0);

  const ratio = totalExpenses / event.budget;

  const thresholds = [
    { at: 0.8, type: 'budget_80', title: '⚠ Budget Warning: 80% Used', message: `Event "${event.name}" has used 80% of its budget.` },
    { at: 0.9, type: 'budget_90', title: '⚠ Budget Warning: 90% Used', message: `Event "${event.name}" has used 90% of its budget.` },
    { at: 1.0, type: 'budget_100', title: '🚫 Over Budget Alert', message: `Event "${event.name}" is over budget! (${formatCurrency(totalExpenses)} spent against ${formatCurrency(event.budget)} budget).` },
  ];

  for (const threshold of thresholds) {
    if (ratio >= threshold.at) {
      const notifType = `${threshold.type}_${eventId}`;
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', event.adviser_id)
        .eq('type', notifType)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({
          user_id: event.adviser_id,
          title: threshold.title,
          message: threshold.message,
          type: notifType,
          event_id: eventId,
        });
        await createAuditLog(event.department_id, threshold.title, {
          event_id: eventId,
          event_name: event.name,
          budget: event.budget,
          total_expenses: totalExpenses,
          ratio: Math.round(ratio * 100) + '%',
        });
      }
    }
  }
}

export async function rejectNoReceiptForm(formId: string, eventId: string, reason: string) {
  const supabase = await createClient();
  const { data: form } = await supabase
    .from('no_receipt_forms')
    .select('*, events!inner(department_id, name)')
    .eq('id', formId)
    .single();

  if (!form) throw new Error('Form not found');

  const isResubmitted = (form.witnesses as any[])?.some((w: any) => w?._marker === 'resubmitted');
  if (form.status === 'pending' && (form.rejection_reason || isResubmitted)) {
    const { error } = await supabase
      .from('no_receipt_forms')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('id', formId);

    if (error) throw new Error(error.message);

    await supabase.from('notifications').insert({
      user_id: form.submitted_by,
      title: 'Form Permanently Rejected',
      message: `Your no-receipt form "${form.expense_name}" has been permanently rejected. Reason: ${reason}`,
      type: 'form_rejected',
      event_id: eventId,
    });
  } else {
    // First rejection - set rejection reason but keep status as pending for resubmission
    const { error } = await supabase
      .from('no_receipt_forms')
      .update({ status: 'pending', rejection_reason: reason })
      .eq('id', formId);

    if (error) throw new Error(error.message);

    await supabase.from('notifications').insert({
      user_id: form.submitted_by,
      title: 'Form Needs Revision',
      message: `Your no-receipt form "${form.expense_name}" was rejected. Reason: ${reason}. Please submit a revised explanation.`,
      type: 'form_rejected',
      event_id: eventId,
    });
  }

  await createAuditLog((form.events as any).department_id, 'No-receipt form rejected', {
    event_id: eventId,
    event_name: (form.events as any).name,
    form_id: formId,
    expense_name: form.expense_name,
    rejection_reason: reason,
  });

  revalidatePath(`/adviser/pending`);
  revalidatePath(`/officer/events/${eventId}`);
  return true;
}

export async function resubmitNoReceiptForm(formId: string, eventId: string, explanation: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Verify the officer is the submitter
  const { data: existing } = await supabase
    .from('no_receipt_forms')
    .select('submitted_by, witnesses')
    .eq('id', formId)
    .single();

  if (!existing) throw new Error('Form not found');
  if (existing.submitted_by !== user.id) throw new Error('You can only resubmit your own forms');

  const witnesses = (existing.witnesses as any[]) || [];
  if (!witnesses.some((w: any) => w._marker === 'resubmitted')) {
    witnesses.push({ _marker: 'resubmitted' });
  }

  const { error } = await supabase
    .from('no_receipt_forms')
    .update({
      description: explanation,
      status: 'pending',
      rejection_reason: null,
      witnesses,
    })
    .eq('id', formId);

  if (error) throw new Error(error.message);

  // Notify adviser
  const event = await getEvent(eventId);
  if (event?.adviser_id) {
    await supabase.from('notifications').insert({
      user_id: event.adviser_id,
      title: 'Form Resubmitted',
      message: `A no-receipt form has been resubmitted for "${event.name}".`,
      type: 'form_resubmitted',
      event_id: eventId,
    });
  }

  await createAuditLog(event.department_id, 'No-receipt form resubmitted', {
    event_id: eventId,
    event_name: event.name,
    form_id: formId,
  });

  revalidatePath(`/officer/events/${eventId}`);
  return true;
}

// ─── Financial Reports ───

export async function generateFinancialReport(eventId: string, departmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Gather data
  const event = await getEvent(eventId);
  const receipts = await getReceipts(eventId);
  const forms = await getNoReceiptForms(eventId);
  const department = (await supabase.from('departments').select('name').eq('id', departmentId).single()).data;

  const approvedReceipts = receipts.filter(r => r.status === 'approved');
  const approvedForms = forms.filter(f => f.status === 'approved');

  const totalExpenses = [...approvedReceipts, ...approvedForms].reduce((sum, item: any) => sum + (item.total || item.amount || 0), 0);

  // Create report record
  const { data: report, error } = await supabase
    .from('financial_reports')
    .insert({
      event_id: eventId,
      generated_by: user.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Notify adviser
  if (event?.adviser_id) {
    await supabase.from('notifications').insert({
      user_id: event.adviser_id,
      title: 'Financial Statement Ready',
      message: `Financial Statement for "${event.name}" is ready for review.`,
      type: 'fs_ready',
      event_id: eventId,
    });
  }

  await createAuditLog(departmentId, 'Financial statement generated', {
    event_id: eventId,
    event_name: event.name,
    report_id: report.id,
  });

  revalidatePath(`/officer/events/${eventId}`);
  return report;
}

export async function approveFinancialReport(reportId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: report } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) throw new Error('Report not found');

  const { error } = await supabase
    .from('financial_reports')
    .update({ status: 'approved', approved_by: user.id })
    .eq('id', reportId);

  if (error) throw new Error(error.message);

  // Notify officer
  const event = await getEvent(eventId);
  if (event) {
    await supabase.from('notifications').insert({
      user_id: event.officer_id,
      title: 'Financial Statement Approved',
      message: `The Financial Statement for "${event.name}" has been approved. You can now download the PDF.`,
      type: 'fs_approved',
      event_id: eventId,
    });
  }

  await createAuditLog(event.department_id, 'Financial statement approved', {
    event_id: eventId,
    event_name: event.name,
    report_id: reportId,
  });

  revalidatePath(`/adviser/events/${eventId}`);
  return true;
}

export const getFinancialReport = cache(async (eventId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('financial_reports')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
});

// ─── Notifications ───

export const getNotifications = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('*, events!left(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data || []).map((n: any) => ({
    ...n,
    events: n.events || null,
  })) as any[];
});

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw new Error(error.message);
  return true;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(error.message);
  return true;
}

// ─── Users (Admin) ───

export const getDepartmentUsers = cache(async (departmentId: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('department_id', departmentId)
    .order('last_name');
  return data || [];
});

export const getAllProfiles = cache(async () => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('*, departments(name)')
    .order('last_name');
  return data || [];
});

export async function deleteUser(userId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (!profile || profile.role !== 'admin') throw new Error('Only admins can delete users');

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name, department_id, role')
    .eq('user_id', userId)
    .single();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  if (targetProfile?.department_id) {
    await createAuditLog(targetProfile.department_id, 'User deleted', {
      deleted_user_id: userId,
      deleted_user_name: `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim(),
      deleted_user_role: targetProfile.role,
    });
  }

  revalidatePath('/admin/departments');
  return true;
}

// ─── Financial Reports Dashboard ───

export async function getEventsWithFsStatus(departmentId: string) {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('*, officer:profiles!events_officer_id_fkey(first_name, last_name)')
    .eq('department_id', departmentId)
    .order('created_at', { ascending: false });

  if (!events || events.length === 0) return [];

  const eventIds = events.map(e => e.id);

  // Batch: get all forms for all events in one query
  const { data: allForms } = await supabase
    .from('no_receipt_forms')
    .select('event_id, status')
    .in('event_id', eventIds);

  // Batch: get all financial reports for all events in one query
  const { data: allReports } = await supabase
    .from('financial_reports')
    .select('event_id')
    .in('event_id', eventIds);

  // Index by event_id
  const formsByEvent: Record<string, any[]> = {};
  for (const form of allForms || []) {
    if (!formsByEvent[form.event_id]) formsByEvent[form.event_id] = [];
    formsByEvent[form.event_id].push(form);
  }

  const reportsSet = new Set((allReports || []).map(r => r.event_id));

  return events.map(event => {
    const forms = formsByEvent[event.id] || [];
    const pendingForms = forms.filter(f => f.status !== 'approved');
    return {
      ...event,
      formCount: forms.length,
      pendingFormCount: pendingForms.length,
      canGenerateFs: forms.length > 0 && pendingForms.length === 0,
      hasFsRecord: reportsSet.has(event.id),
    };
  });
}

export async function getFsDetailData(eventId: string) {
  const supabase = await createClient();

  const event = await getEvent(eventId);
  if (!event) throw new Error('Event not found');

  // Batch department query with the event data we already have
  const [{ data: department }, receipts, forms, fsRecord] = await Promise.all([
    supabase.from('departments').select('name').eq('id', event.department_id).single(),
    getReceipts(eventId),
    getNoReceiptForms(eventId),
    getFinancialReport(eventId).catch(() => null),
  ]);

  const approvedReceipts = receipts.filter((r: any) => r.status === 'approved');
  const approvedForms = forms.filter((f: any) => f.status === 'approved');

  const pendingForms = forms.filter((f: any) => f.status !== 'approved');
  const formCount = forms.length;
  const pendingFormCount = pendingForms.length;
  const canGenerateFs = formCount > 0 && pendingFormCount === 0;

  const totalReceiptExpenses = approvedReceipts.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
  const totalFormExpenses = approvedForms.reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  const totalExpenses = totalReceiptExpenses + totalFormExpenses;

  const remainingBudget = event.budget;

  const categoryBreakdown: Record<string, number> = {};
  for (const r of approvedReceipts) {
    const cat = r.category || 'Uncategorized';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (r.total || 0);
  }
  for (const f of approvedForms) {
    const cat = f.expense_type || 'Other';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (f.amount || 0);
  }

  return {
    event,
    departmentName: department?.name || '',
    approvedReceipts,
    approvedForms,
    formCount,
    pendingFormCount,
    canGenerateFs,
    totalExpenses,
    totalReceiptExpenses,
    totalFormExpenses,
    remainingBudget,
    categoryBreakdown,
    fsRecord,
  };
}
