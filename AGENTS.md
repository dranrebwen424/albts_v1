<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# ALBTS — System Documentation

## Overview
**ALBTS** (Departmental Liquidation & Budget Tracking System) is a financial management app for university departments. Three roles manage event budgets: **Officers** handle receipts/no-receipt forms, **Advisers** approve/reject them, and **Admins** manage departments/users.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.7 (App Router, Turbopack) |
| Language | TypeScript 5, React 19.2.4 |
| Styling | Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`) |
| UI primitives | Radix UI (`@radix-ui/react-*`) + shadcn/ui patterns |
| State | Zustand 5 (auth, events, notifications, sidebar) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`) |
| Blockchain | ethers.js 6 (keccak256 hashing for receipt/form verification) |
| OCR | OpenRouter → Gemini 2.5 Flash (`src/lib/openrouter/client.ts`) |
| Email | nodemailer (Gmail SMTP) (`src/lib/email/client.ts`) |
| PDF | `@react-pdf/renderer` 4.5.1 (server-side via API route) |
| Charts | recharts 3.8.1 (dynamic import wrapped in `BudgetChart`) |
| Forms | react-hook-form + zod 4 |
| Icons | lucide-react 1.17 |
| Toasts | sonner 2 |
| Validation | zod 4 |
| Linting | ESLint 9 + `eslint-config-next` |

---

## Project Structure

```
src/
  app/
    globals.css                              # Tailwind v4 theme (@import, @theme, @keyframes, @utility)
    layout.tsx                               # Root layout: Inter + Instrument Serif fonts, metadata
    page.tsx                                 # Redirects to /login
    middleware.ts                            # Auth middleware (session check, role-based redirect)
    (auth)/                                  # Route group — public auth pages
      login/page.tsx                         # Email/password sign-in
      forgot-password/page.tsx               # Request password reset code
      verify-reset-code/page.tsx             # Enter 6-digit code (Suspense)
      set-password/page.tsx                  # Set password via token (Suspense)
      change-password/page.tsx               # First-time / profile password change
    (dashboard)/                             # Route group — protected app
      officer/                               # Role: Officer
        layout.tsx                           # Wraps with DashboardLayout
        events/
          page.tsx                           # Event list + create dialog
          loading.tsx
          [eventId]/
            page.tsx                         # Server Component shell
            loading.tsx
            event-detail-client.tsx          # Receipts upload, forms, budget chart, camera
        reports/
          page.tsx                           # FS status grid from Zustand cache
          loading.tsx
          [eventId]/
            page.tsx + loading.tsx           # FS detail, generate PDF, mark done
        notifications/page.tsx + loading.tsx
        profile/page.tsx + loading.tsx
      adviser/                               # Role: Adviser (same structure as officer)
        events/
          [eventId]/
            page.tsx + event-detail-client.tsx
        pending/page.tsx                     # Approve/reject forms page
        reports/[eventId]/page.tsx           # FS detail + approve
        notifications/page.tsx
        profile/page.tsx
      admin/                                 # Role: Admin
        departments/
          page.tsx                           # Department list + create
          [deptId]/
            layout.tsx                       # Tabs: Events, Audit Logs, Reports, Users
            events/
              page.tsx                       # Event list for department
              [eventId]/
                page.tsx + event-detail-client.tsx
            audit-logs/page.tsx
            reports/
              page.tsx                       # Reports list with summaries
              [eventId]/
                page.tsx + report-detail-client.tsx  # View-only FS detail
            users/
              page.tsx                       # User list + create/delete
              [userId]/page.tsx              # User profile + activity
        profile/page.tsx
    api/
      auth/
        get-role/route.ts                    # GET: returns profile for client-side routing
        create-user/route.ts                 # POST: creates auth user + profile + sends welcome email
      pdf/
        generate/route.tsx                   # POST: renders FsDocument to PDF Buffer
  components/
    layout/
      sidebar.tsx                            # Desktop sidebar + mobile Sheet + background polling
      mobile-nav.tsx                         # Bottom nav + top header (mobile)
      dashboard-layout.tsx                   # Main wrapper: auth init, sidebar, responsive
    ui/                                      # shadcn/ui primitives (button, card, badge, input, etc.)
    camera/
      camera-capture.tsx                     # Full camera: torch, switch, focus analysis
      upload-sheet.tsx                       # Mobile bottom sheet: Take Photo / Browse Files
      viewfinder-overlay.tsx                 # Focus/stability overlay
    shared/
      budget-chart.tsx                       # Dynamic recharts donut chart (ssr: false)
    profile/
      profile-page.tsx                       # Shared profile component (all roles)
    notifications/
      notifications-page.tsx                 # Shared notification list
  lib/
    actions.ts                               # ALL server actions (~1300 lines)
    supabase/
      server.ts                              # SSR client (next/headers cookies)
      client.ts                              # Browser client (createBrowserClient)
      admin.ts                               # Service-role client (SUPABASE_SERVICE_ROLE_KEY)
    blockchain/client.ts                     # ethers.js: recordHash, generateHash, verifyHash
    email/client.ts                          # nodemailer (Gmail SMTP)
    openrouter/client.ts                     # Gemini 2.5 Flash OCR for receipt parsing
    pdf/
      generator.ts                           # Client-side download helper (POST to API)
      fs-template.tsx                        # @react-pdf FsDocument template (LETTER size)
    utils/
      cn.ts                                  # cn() = clsx + tailwind-merge
      format.ts                              # formatCurrency (PHP), formatDate, formatDateTime
  stores/
    auth.ts                                  # useAuthStore: profile, setProfile, clearProfile
    events.ts                                # useEventsStore: events, eventDetailCache, fsDetailCache
    notifications.ts                         # useNotifStore: notifications, unreadCount
    sidebar.ts                               # useSidebarStore: collapsed, mobileOpen, isMobile
  types/
    index.ts                                 # All interfaces (Event, Receipt, NoReceiptForm, etc.)
  middleware.ts                              # Supabase SSR auth middleware
```

---

## Routing & Roles

Three role-specific route groups under `(dashboard)/`:
- `/officer/*` — Upload receipts, manage no-receipt forms, generate FS
- `/adviser/*` — Approve/reject forms, approve financial statements
- `/admin/*` — Manage departments, events, users, view reports

Auth pages in `(auth)/` are outside the dashboard layout.

---

## Database Tables (Supabase)

| Table | Key Purpose |
|-------|-------------|
| `departments` | id, name, code |
| `profiles` | id, user_id, first_name, last_name, department_id, role, password_changed, status |
| `events` | id, department_id, name, officer_id, adviser_id, budget (running), status |
| `receipts` | id, event_id, vendor, items[], total, category, image_url, status, transaction_hash |
| `no_receipt_forms` | id, event_id, expense_type, amount, witnesses[], status, rejection_reason |
| `financial_reports` | id, event_id, generated_by, status, approved_by |
| `notifications` | id, user_id, title, message, type, read, event_id |
| `audit_logs` | id, admin_id, department_id, action, details |
| `password_reset_codes` | id, email, code_hash, reset_token, expires_at, used, type |

Budget is a **running balance** — deducted on receipt/form approval, NOT computed from sum of expenses.

---

## Data Flow Pattern

```
User Action → Client Component → Server Action (src/lib/actions.ts)
                                    → Supabase query/mutation
                                    → revalidatePath()
                                    → Return data to client
                                    → Client updates Zustand store (optional)
                                    → React re-renders
```

### Prefetch Pipeline (for instant navigation)
1. Sidebar polls events (60s) + notifications (30s) into Zustand stores (only when visible)
2. List pages batch-prefetch detail data on mount (`prefetchEventDetail()` / `prefetchFsDetail()`)
3. All `<Link>` components use `prefetch={true}`
4. Some Server Component pages fetch data via `Promise.all()` during navigation

---

## Key Conventions

### Code Style
- NO comments unless the logic is non-obvious
- Minimal, direct responses — no preamble/postamble
- Prefer editing existing files over creating new ones

### File Naming
| Context | Convention | Examples |
|---------|-----------|----------|
| UI components | `kebab-case` | `button.tsx`, `card.tsx` |
| Feature components | `kebab-case` | `dashboard-layout.tsx`, `camera-capture.tsx` |
| Pages | `page.tsx` | Always exactly `page.tsx` |
| Loading states | `loading.tsx` | Always exactly `loading.tsx` |
| Client islands | `*-client.tsx` | `event-detail-client.tsx` |
| Stores | `name.ts` | `auth.ts`, `events.ts` |
| Lib files | `kebab-case` | `supabase/server.ts` |

### State Management
- **Zustand stores** for prefetched/cached data (events, auth profile, notifications)
- **Server Actions** for all DB mutations and fresh reads
- **Server Components** (async `page.tsx`) for initial data fetch on admin event/report detail pages
- **Client Components** for all interactive pages

### Performance Rules
- All `<Link>` components must have `prefetch={true}`
- List pages must batch-prefetch detail data on mount
- Avoid `button` + `router.push()` — use `<Link prefetch={true}>` instead
- Dynamic import (`next/dynamic` with `{ ssr: false }`) for any heavy third-party component (recharts, camera, upload-sheet)
- Server Components for detail page shells (fetch data, render header, pass to client)
- All data fetching in server actions should use `Promise.all()` for parallel execution
- Background polling must check `document.visibilityState === 'visible'`
- Double-click guards on all mutation handlers (`if (submitting) return`)

### UI Conventions
- **shadcn/ui** primitives from `@/components/ui/*`
- Styling via Tailwind v4 CSS-based config (`@theme inline`, `@utility`)
- Font: Inter (sans) + Instrument Serif (serif)
- Icons from `lucide-react`
- Toasts via `sonner` (`toast.success`, `toast.error`)

### Server Actions (`src/lib/actions.ts`)
- All exported as `const functionName = cache(async (...) => {...})` or `export async function functionName(...)`
- Read actions wrapped with React `cache()` for deduplication
- Mutations call `revalidatePath()` to invalidate caches
- Admin-only actions check `profile.role !== 'admin'` inline
- OCR uploads limited to 10MB via `serverActions.bodySizeLimit`

---

## Files Requiring Attention

### Navigation optimization (all `<Link>` must have `prefetch={true}`)
- Tab links in `admin/[deptId]/layout.tsx`
- Card links in `admin/[deptId]/events/page.tsx`
- Card links in `admin/[deptId]/reports/page.tsx`

### Data fetching (avoid client-side waterfalls)
- `admin/[deptId]/reports/[eventId]/page.tsx` — has client-side fetch in useEffect
- `admin/[deptId]/events/[eventId]/page.tsx` — now a Server Component (good)
- `admin/[deptId]/audit-logs/page.tsx` — inline Supabase query, could use server action

### Imports (avoid static heavy imports)
- recharts is dynamically imported via `BudgetChart` component
- `CameraCapture` and `UploadSheet` are dynamically imported
- All other large packages are in `optimizePackageImports`

---

## Environment Variables

### Required on Vercel
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Gmail address (liquifymabini@gmail.com) |
| `SMTP_PASS` | Gmail App Password |
| `OPENROUTER_API_KEY` | OpenRouter API key for OCR |
| `NEXT_PUBLIC_APP_URL` | Production URL (`https://albtsv1.vercel.app`) |
| `BLOCKCHAIN_RPC_URL` | Infura RPC URL |
| `BLOCKCHAIN_PRIVATE_KEY` | Wallet private key |
| `BLOCKCHAIN_CONTRACT_ADDRESS` | Smart contract address |

Note: Old `EMAILJS_*` vars should be deleted from Vercel (replaced by `SMTP_*`).

---

## Build & Lint

```bash
npx tsc --noEmit        # TypeScript check
npx next build           # Production build
npx vercel --prod        # Deploy to Vercel
npx next lint            # ESLint
```

