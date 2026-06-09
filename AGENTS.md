<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Financial Reports Feature (June 2026)

## Overview
Dedicated Financial Reports pages for officer and adviser roles. Shows all department events with FS readiness status, summary of liquidation, and PDF generation.

## User Flow
- **Sidebar**: "Financial Reports" nav item available for officer (`/officer/reports`) and adviser (`/adviser/reports`)
- **List page**: Card grid showing event name, date, officer name, and status badge (Ongoing / Ready to Generate / FS Generated / Completed)
- **Detail page** (officer): Budget/expenses/remaining stat cards, category breakdown table, approved receipts list, approved no-receipt forms list, "Generate & Download PDF FS" button (disabled when not ready with reason), "Mark as Done" button (enabled only after FS generated)
- **Detail page** (adviser): Same summary but view-only, "Approve Financial Statement" button when FS is pending
- **Event page (officer)**: "View Financial Report" button replaces old Generate FS + Mark as Done card
- **Event page (adviser)**: "View Financial Report" button added
- **Navigation**: Two-way links between event detail page and report detail page

## "Ready to Generate" Logic
- `canGenerateFs = true` only when no-receipt forms exist AND all are approved
- If no forms exist → shows "Ongoing" with disabled button + reason "No no-receipt forms for this event"
- If forms are pending → shows "Ongoing" with disabled button + count of pending forms
- "Mark as Done" enabled only after `financial_reports` record exists

## Key Files
- `src/lib/actions.ts` — `getEventsWithFsStatus()`, `getFsDetailData()`
- `src/app/(dashboard)/officer/reports/page.tsx` — Officer reports list
- `src/app/(dashboard)/officer/reports/[eventId]/page.tsx` — Officer report detail
- `src/app/(dashboard)/adviser/reports/page.tsx` — Adviser reports list
- `src/app/(dashboard)/adviser/reports/[eventId]/page.tsx` — Adviser report detail
- `src/lib/pdf/fs-template.tsx` — FS PDF template (using @react-pdf/renderer)
- `src/app/api/pdf/generate/route.tsx` — PDF generation API endpoint
- `src/lib/pdf/generator.ts` — Client-side PDF download helper (updated type)
- `src/components/layout/sidebar.tsx` — Added nav items

## Data Flow
1. `getEventsWithFsStatus(departmentId)` → returns events with `canGenerateFs`, `hasFsRecord`, form counts
2. `getFsDetailData(eventId)` → returns full summary: approved receipts/forms, totals, category breakdown, fsRecord
3. Officer clicks "Generate & Download PDF FS" → calls server action `generateFinancialReport` (creates DB record + notifies adviser) + client-side `downloadPdf` (POST to `/api/pdf/generate` → renders PDF via `FsDocument` → downloads blob)
4. Adviser sees notification → approves via `/adviser/reports/[eventId]`

## PDF Generation
- Uses `@react-pdf/renderer` (installed)
- Template at `src/lib/pdf/fs-template.tsx` — LETTER size, includes header, budget summary, expense table, category breakdown, signature lines
- API route at `src/app/api/pdf/generate/route.tsx` — renders `FsDocument` to stream, returns PDF as Buffer
