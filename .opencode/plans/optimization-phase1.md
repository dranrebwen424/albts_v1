# Optimization Plan — Phase 1

## 1. Split 2221-line officer event-detail-client.tsx

**File:** `src/app/(dashboard)/officer/events/[eventId]/event-detail-client.tsx`

**Goal:** Break into 5 focused files for faster hydration, smaller bundle per route, and isolated re-renders.

### New file structure:

```
officer/events/[eventId]/
  page.tsx                      (unchanged — server component shell)
  error.tsx                     (already created)
  event-detail-client.tsx        ← slimmed down: imports sub-components + passes props
  components/
    mobile-layout.tsx            ← mobile budget card, expense list, FAB
    desktop-layout.tsx           ← desktop split view with sidebar
    budget-kpi-card.tsx          ← BudgetChart + Total/Spent/Remain KPI grid
    expense-list.tsx             ← Filtered expense items (receipts + forms)
    receipt-review-dialog.tsx    ← OCR review / manual entry modal
    no-receipt-form-dialog.tsx   ← Multi-step no-receipt form wizard
    receipt-detail-modal.tsx     ← Receipt image + data detail view
    form-detail-modal.tsx        ← No-receipt form detail view
    ocr-error-dialog.tsx         ← OCR failure retry options
    add-entry-modal.tsx          ← FAB → choose receipt upload or form
```

**Approach:** Extract incrementally, one component at a time. Each extracted component receives only the props it needs (event, receipts, forms, handlers), reducing the render surface area.

---

## 2. Fix Zustand Store Subscriptions

**Goal:** Prevent cascade re-renders by subscribing to individual fields instead of entire stores.

### 2.1 `src/components/layout/sidebar.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 47 | `const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebarStore()` | 4 individual selectors |
| 48 | `const { profile } = useAuthStore()` | `const profile = useAuthStore(s => s.profile)` |
| 70 | `const { setNotifications, unreadCount } = useNotifStore()` | 2 individual selectors |
| 82 | `const { setEvents } = useEventsStore()` | `const setEvents = useEventsStore(s => s.setEvents)` |

### 2.2 `src/components/layout/mobile-nav.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 39 | `const { profile } = useAuthStore()` | `const profile = useAuthStore(s => s.profile)` |
| 40 | `const { unreadCount } = useNotifStore()` | `const unreadCount = useNotifStore(s => s.unreadCount)` |

### 2.3 `src/components/layout/dashboard-layout.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 14 | `const { collapsed, setIsMobile, isMobile } = useSidebarStore()` | 3 individual selectors |
| 15 | `const { setProfile } = useAuthStore()` | `const setProfile = useAuthStore(s => s.setProfile)` |

### 2.4 `src/components/notifications/notifications-page.tsx`

| Line | Current | Change to |
|------|---------|-----------|
| 45 | `const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotifStore()` | 5 individual selectors |

### 2.5 Event detail clients (3 files)

| File | Line | Current | Change to |
|------|------|---------|-----------|
| officer event-detail-client | 135 | `const { isMobile } = useSidebarStore()` | `const isMobile = useSidebarStore(s => s.isMobile)` |
| adviser event-detail-client | 115 | Same | Same |
| admin event-detail-client | 80 | Same | Same |

---

## 3. Add useCallback/useMemo

### 3.1 `officer/events/[eventId]/event-detail-client.tsx`

**Wrap in `useMemo`:**
- `totalExpenses` (lines 336-337) — adds approved receipts + forms
- All KPI counts (lines 340-347): `approvedReceipts`, `pendingReceipts`, `rejectedReceipts`, `approvedForms`, `pendingForms`, `rejectedForms`

**Wrap in `useCallback`:**
- `handleConfirmReceipt` (line 237) — deps: `[editingReceipt, confirmingReceipt, eventId, receipts, setReceipts, setEvent]`
- `handleSubmitForm` (line 351) — deps: `[submittingForm, expenseType, formData, eventId, forms, setForms]`
- `handleResubmit` (line 402) — deps: `[resubmitting, resubmitTarget, resubmitExplanation, eventId, forms, setForms]`
- `handleOpenAddEntry` (line 428) — stable
- `handleChooseWithReceipt` (line 433) — stable
- `handleChooseNoReceipt` (line 437) — stable

### 3.2 `adviser/events/[eventId]/event-detail-client.tsx`

**Wrap in `useMemo`:**
- `totalExpenses` — same pattern as officer
- All KPI counts

**Wrap in `useCallback`:**
- `handleApproveForm` — deps: `[approvingForm, eventId, forms, setForms, event, setEvent]`
- `handleRejectForm` — deps: `[rejectingForm, rejectTarget, rejectReason, eventId, forms, setForms]`
- `handleApproveReport` — deps: `[approvingReport, eventId, report, setReport, forms, setForms]`

### 3.3 `adviser/pending/page.tsx`

- `loadForms` — wrap in `useCallback`, deps: `[profile]`
- `handleApprove` — wrap in `useCallback`
- `handleReject` — wrap in `useCallback`

---

## 4. Optimize Server Actions (`src/lib/actions.ts`)

### 4.1 Wrap read actions in `React.cache()`

| Function | Line | Change |
|----------|------|--------|
| `getEventsWithFsStatus` | 850 | Add `cache()` wrapper |
| `getFsDetailData` | 894 | Add `cache()` wrapper |
| `prefetchEventDetail` | 953 | Add `cache()` wrapper |
| `prefetchFsDetail` | 963 | Add `cache()` wrapper |

### 4.2 Targeted `.select()` instead of `*`

| Function | Line | Current | Change to |
|----------|------|---------|-----------|
| `getEvent` | 60 | `select('*, officer:..., adviser:...')` — fetches ALL event columns | List only needed columns: `id, name, budget, original_budget, status, department_id, officer_id, adviser_id, created_at, officer:..., adviser:...` |
| `getEventsWithFsStatus` | 852 | `select('*, officer:...')` — fetches ALL columns | Only `id, name, budget, original_budget, status, created_at, department_id, officer_id, adviser_id, officer:...` |
| `createReceipt` → confirmReceipt event fetch | 205 | `select('budget, original_budget, department_id, name')` — already targeted ✅ | Keep as-is |

### 4.3 Parallelize sequential DB calls

**`createEvent` (line 73-91):**
- `checkUserActive()` and profile role check both hit the DB. `checkUserActive()` already returns the user, but the profile role check re-fetches the profile. Could cache the profile fetch or combine.

**`confirmReceipt` (line 201-263):**
- Event fetch (line 203) → budget deduction (line 212) → receipt insert (line 220) — these are sequential by necessity (budget deduction before receipt insert)
- But notification insert (line 233) could be parallelized with receipt select (line 236)
- Blockchain operations (line 243) could be fire-and-forget

### 4.4 Remove redundant `revalidatePath` calls

`approveNoReceiptForm` (line 465-466):
```tsx
revalidatePath(`/adviser/pending`);
revalidatePath(`/officer/events/${eventId}`);
```
Both are needed (adviser and officer views). No change needed.

### 4.5 Clean up audit log and notification writes that run in same request

- In `approveReceipt` and `approveNoReceiptForm`, the `createAuditLog` call runs separately. Consider batching it with other writes if possible.
