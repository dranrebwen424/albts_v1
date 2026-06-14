# Fix: Budget calculation — add `original_budget` column

**Approach:** Add an `original_budget` column to the events table so we can display Total (original), Spent, and Remaining (original - spent) correctly.

---

## 1. Database Migration

```sql
ALTER TABLE events ADD COLUMN original_budget numeric NOT NULL DEFAULT 0;
-- Backfill existing rows (original = running_budget + sum of all approved expenses)
UPDATE events e
SET original_budget = e.budget + COALESCE(
  (SELECT SUM(r.total) FROM receipts r WHERE r.event_id = e.id AND r.status = 'approved')
  +
  (SELECT SUM(n.amount) FROM no_receipt_forms n WHERE n.event_id = e.id AND n.status = 'approved')
, 0);
```

---

## 2. Type Changes

### `src/types/index.ts` (line 40)
Add `original_budget: number;` to the `Event` interface.

### `src/stores/events.ts` (line 8)
Add `original_budget: number;` to `EventWithFsStatus`.

---

## 3. Server Actions (`src/lib/actions.ts`)

### `createEvent` (line 89)
Insert `original_budget` alongside `budget`:
```tsx
.insert({ department_id: departmentId, name, officer_id: officerId, adviser_id: adviserId, budget, original_budget: budget })
```

### `getEvent` (line 60)
Add `original_budget` to the select.

### `createReceipt` (line 205)
Add `original_budget` to select.

### `approveReceipt` (lines 272-287)
- Add `original_budget` to the join select
- **Remove** the `if (newBudget < 0) throw new Error('Insufficient budget')` guard (allow overspend)
- Keep updating the running `budget` column

### `approveNoReceiptForm` (line 417)
Add `original_budget` to the join select.

### `checkBudgetThreshold` (lines 483, 487, 499)
- Select `original_budget` instead of `budget`
- Change guard: `if (!event || event.original_budget <= 0) return;`
- Change ratio: `const ratio = totalExpenses / event.original_budget;`
- Update audit log detail to use `original_budget`

### `getEventsWithFsStatus` (line 922)
- Add `original_budget` to select
- Update the `remainingBudget` calculation

---

## 4. Event Detail Client Components (3 files)

All three follow the same pattern. For each:

### Officer: `src/app/(dashboard)/officer/events/[eventId]/event-detail-client.tsx`
- Line 460: `budgetPercent = Math.min((totalExpenses / (event?.original_budget || 1)) * 100, 100)`
- Line 461: `remainingBalance = (event?.original_budget || 0) - totalExpenses`
- Line 1361: Total = `event?.original_budget || 0`
- Line 1369: Remaining = `(event?.original_budget || 0) - totalExpenses`
- Line 1372-1374: Over-budget check on remaining (not event.budget)

### Adviser: `src/app/(dashboard)/adviser/events/[eventId]/event-detail-client.tsx`
Same changes as officer (lines 238, 239, 756, 759, 1018, 1022, 1030, 1033, 1035)

### Admin: `src/app/(dashboard)/admin/departments/[deptId]/events/[eventId]/event-detail-client.tsx`
Same changes as officer (lines 165, 166, 725, 729, 737, 740, 742)

---

## 5. Events List Pages (3 files)

### Officer: `src/app/(dashboard)/officer/events/page.tsx` (line 162)
`formatCurrency(event.original_budget)` — shows original budget in event cards.

### Adviser: `src/app/(dashboard)/adviser/events/page.tsx` (line 72)
Same change.

### Admin: `src/app/(dashboard)/admin/departments/[deptId]/events/page.tsx` (line 62)
Same change.

---

## 6. Reports / Financial Statement Pages

### Officer report: `src/app/(dashboard)/officer/reports/[eventId]/page.tsx` (lines 79, 184)
- Line 79: `totalBudget: data.event.original_budget`
- Line 184: `formatCurrency(data.event.original_budget)`

### Adviser report: `src/app/(dashboard)/adviser/reports/[eventId]/page.tsx` (line 121)
- `formatCurrency(data.event.original_budget)` — this is the "Total Budget" label

### Admin reports list: `src/app/(dashboard)/admin/departments/[deptId]/reports/page.tsx` (lines 76, 84)
- Line 76: `event.original_budget` (Total Budget)
- Line 84: `event.original_budget - event.totalExpenses` (Remaining)

### Admin report detail: `.../admin/.../reports/[eventId]/report-detail-client.tsx` (line 70)
- `formatCurrency(data.event.original_budget)` — this is "Original Budget"

---

## 7. BudgetChart Component

`src/components/shared/budget-chart.tsx` — No changes needed. It takes `used` and `remaining` as props and renders a donut chart. Callers will pass the correct values.

---

## 8. `getEventsWithFsStatus` (actions.ts line 922)

The `fsDetailData` returned by `prefetchFsDetail` includes event data — update to use `original_budget`.

---

## Summary of all files to modify

| # | File | Action |
|---|------|--------|
| 1 | `src/types/index.ts` | Add `original_budget` to Event interface |
| 2 | `src/stores/events.ts` | Add `original_budget` to EventWithFsStatus |
| 3 | `src/lib/actions.ts` | 15+ changes (create, approve, threshold, queries) |
| 4 | `.../officer/events/[eventId]/event-detail-client.tsx` | 7 budget references |
| 5 | `.../adviser/events/[eventId]/event-detail-client.tsx` | 9 budget references |
| 6 | `.../admin/.../events/[eventId]/event-detail-client.tsx` | 7 budget references |
| 7 | `.../officer/events/page.tsx` | 1 display reference |
| 8 | `.../adviser/events/page.tsx` | 1 display reference |
| 9 | `.../admin/.../events/page.tsx` | 1 display reference |
| 10 | `.../officer/reports/[eventId]/page.tsx` | 2 references |
| 11 | `.../adviser/reports/[eventId]/page.tsx` | 1 reference |
| 12 | `.../admin/.../reports/page.tsx` | 2 references |
| 13 | `.../admin/.../reports/[eventId]/report-detail-client.tsx` | 1 reference |
| — | Database migration | Run SQL in Supabase dashboard |
