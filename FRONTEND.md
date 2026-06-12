# ALBTS Design System — Frontend Redesign Spec

## Identity

**Tone:** Calm, confident, deeply refined — like a native iOS/macOS app running in browser.
**Copied vibe:** Apple system apps (reminders, mail, settings) — quiet structure, typographic hierarchy, frosted translucency.
**Invisibility goal:** Users feel capable, not impressed. The interface disappears.

---

## 1. Color Tokens

### Brand accent — Green

| Token | Tailwind alias | Hex | Usage |
|---|---|---|---|
| `--color-primary` | `primary` | `#1DB954` | CTAs, active tabs, primary buttons |
| `--color-primary-hover` | `primary-hover` | `#17A349` | Hover/pressed primary |
| `--color-primary-tint-bg` | `primary-tint-bg` | `#E8F9F0` | Selected state bg, tinted cards |
| `--color-primary-tint-border` | `primary-tint-border` | `#B7EECF` | Stroke on tint cards |
| `--color-primary-tint-text` | `primary-tint-text` | `#0A5C2E` | Text on green tint |

### Neutrals

| Token | Tailwind alias | Hex | Usage |
|---|---|---|---|
| `--color-surface-white` | `surface-white` | `#FFFFFF` | Cards, modals, sheets |
| `--color-bg-app` | `bg-app` | `#F5F5F7` | Page backgrounds |
| `--color-surface-gray` | `surface-gray` | `#F2F2F7` | Secondary cards, nav pills |
| `--color-divider` | `divider` | `#E5E5EA` | Borders, separators |

### Typography

| Token | Tailwind alias | Hex | Usage |
|---|---|---|---|
| `--color-text-primary` | `text-primary` | `#1D1D1F` | Headings, balances |
| `--color-text-body` | `text-body` | `#3A3A3C` | Paragraphs, descriptions |
| `--color-text-secondary` | `text-secondary` | `#86868B` | Labels, captions |
| `--color-text-placeholder` | `text-placeholder` | `#AEAEB2` | Hints, disabled |

### Semantic

| Token | Hex | Usage |
|---|---|---|
| `--color-warning` | `#FF9500` | Warnings, due-soon |
| `--color-error` | `#FF3B30` | Errors, debits, failed |
| `--color-info` | `#0A84FF` | Links, info badges |

---

## 2. Typography

**Primary:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` (SF Pro equivalent)
**Serif accent:** Instrument Serif (for display sizes only)

### Text styles

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `--text-xs` | 11px | 500 | 14px | 0.01em | Labels, captions |
| `--text-sm` | 13px | 400 | 18px | 0 | Body small |
| `--text-base` | 15px | 400 | 22px | 0 | Body |
| `--text-lg` | 17px | 590 | 24px | -0.02em | Card titles |
| `--text-xl` | 20px | 590 | 26px | -0.03em | Section headers |
| `--text-2xl` | 24px | 650 | 30px | -0.04em | Page titles |
| `--text-3xl` | 28px | 700 | 34px | -0.05em | Hero/display |

**Font weight tokens:** 400 (regular), 500 (medium), 590 (semibold), 650 (semibold+), 700 (bold)

---

## 3. Spacing Scale

Use Tailwind v4 spacing utilities. Baseline grid is 4px.

| Class | Rem | px |
|---|---|---|
| `p-0.5` | 0.125 | 2 |
| `p-1` | 0.25 | 4 |
| `p-2` | 0.5 | 8 |
| `p-3` | 0.75 | 12 |
| `p-4` | 1 | 16 |
| `p-5` | 1.25 | 20 |
| `p-6` | 1.5 | 24 |
| `p-8` | 2 | 32 |
| `p-10` | 2.5 | 40 |
| `p-12` | 3 | 48 |
| `p-16` | 4 | 64 |

**Card padding:** `p-5` (20px)
**Page horizontal padding:** `px-6` desktop, `px-4` mobile
**Stack spacing:** `space-y-5` between cards, `space-y-3` between items

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Badges, small elements |
| `--radius-md` | 8px | Buttons, inputs |
| `--radius-lg` | 12px | Cards |
| `--radius-xl` | 16px | Dialogs, sheets |
| `--radius-2xl` | 20px | Bottom sheet top |
| `--radius-3xl` | 28px | Modals |
| `--radius-full` | 9999px | Pills |

---

## 5. Shadows & Depth

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.06)` | Cards rest state |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08)` | Cards hover, dropdowns |
| `--shadow-lg` | `0 8px 30px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)` | Modals, sheets |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.08)` | Toast, overlays |

**Frosted glass** pattern (`backdrop-filter: blur(20px)`) for navigation bars and sheet headers.

---

## 6. Motion Tokens

All animations use spring/ease-out physics — no linear timing.

| Token | Value | Usage |
|---|---|---|
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Enter animations (spring bounciness) |
| `--ease-out` | `cubic-bezier(0.33, 1, 0.68, 1)` | Exit/micro-interactions |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Transitions |
| `--duration-fast` | 150ms | Micro-interactions, hover |
| `--duration-normal` | 300ms | Page transitions |
| `--duration-slow` | 500ms | Staggered reveals |

### Keyframes

- `animate-fade-in`: opacity 0→1 + translateY(4px)→0
- `animate-scale-in`: opacity 0→1 + scale(0.96)→1
- `animate-spring-up`: opacity 0→1 + translateY(16px)→0 (spring easing)
- `animate-slide-up`: translateY(100%)→0 (spring for modals)
- `animate-frost-in`: opacity 0→1 + backdrop-filter blur(0)→blur(20px)

---

## 7. Component Patterns

### Cards
- **Rest:** White bg (`surface-white`), `rounded-xl`, no visible border (use `shadow-sm` instead), padding `p-5`
- **Hover:** `shadow-md` + subtle translateY(-1px) with `duration-normal` + `ease-out`
- **Selected/tinted:** `bg-primary-tint-bg` with `border-primary-tint-border`
- **Empty state:** Centered icon (neutral-300) + label (text-secondary)

### Buttons
- **Primary:** `bg-primary` text-white, `rounded-lg` (8px), h-10 px-5, `text-sm` weight-590
  Hover: `bg-primary-hover` with `shadow-sm`
- **Secondary/ghost:** `text-text-primary`, bg transparent, hover `bg-surface-gray`
- **Outline:** `border-divider` bg-transparent `text-text-body`, hover border `text-text-primary`
- **Destructive:** `bg-error` text-white
- **Icon size:** h-10 w-10 (44px touch target on mobile)

### Inputs & Textareas
- **Rest:** `border-divider` (`#E5E5EA`), `rounded-lg`, `bg-surface-white`, h-10, `text-sm`, padding `px-4`
- **Focus:** Ring 2px `primary` with offset-0, no shadow
- **Placeholder:** `text-placeholder`
- **Label:** `text-sm` weight-500 `text-text-body`, `mb-2`

### Badges (Pills)
- `rounded-full` px-3 py-0.5 `text-xs` weight-500
- **Default/status:** `bg-surface-gray` text-text-secondary
- **Approved:** `bg-primary-tint-bg` text-primary-tint-text
- **Pending:** bg-amber-50 text-amber-700
- **Rejected:** bg-red-50 text-red-600
- **Warning:** bg-orange-50 text-orange-700

### Tabs
- **Tab bar (iOS-style):** Centered pill group, `bg-surface-gray` p-1, `rounded-lg`
- **Trigger rest:** `text-text-secondary` weight-500, px-4 py-1.5
- **Trigger active:** `bg-surface-white` with `shadow-sm`, `text-text-primary`

### Dialog / Sheet
- **Backdrop:** `bg-black/20` with `animate-fade-in`
- **Content:** `bg-surface-white`, `rounded-2xl` (16px), `shadow-lg`
- **Sheet (slide):** `bg-surface-white`, frosted header with `backdrop-filter: blur(20px)`, drag handle (h-1 w-8 `bg-divider` rounded-full centered top)
- **Mobile bottom sheet:** `rounded-t-3xl` (20px), drag-to-dismiss with spring

### Sidebar
- Desktop: `fixed left-0 top-0 h-screen`, `bg-surface-white` with `border-r border-divider`
- Collapsed: w-16 (icon only), Expanded: w-64
- Nav items: `rounded-lg` px-3 py-2.5, active state = `bg-primary-tint-bg` text-primary, icon size h-5 w-5
- Sign out: muted red tint, `text-error` with red-50 hover

### Dropdown Menu (Select)
- Trigger: Same as input (border-divider, rounded-lg, h-10)
- Content: `bg-surface-white`, `rounded-xl`, `shadow-md`, p-1
- Item: `rounded-md` px-3 py-2, hover `bg-surface-gray`

### Scrollbar
- Custom thin scrollbar: `w-1.5`, thumb `bg-divider` rounded-full, track transparent

### Separator
- `h-px w-full bg-divider` — subtle, almost invisible

### Progress Bar
- Track: `bg-surface-gray` rounded-full h-1.5
- Fill: `bg-primary` with `duration-normal ease-out` animation

### Skeleton
- `animate-pulse` with `bg-surface-gray` rounded-lg

### Toasts (sonner)
- Position `top-right`, Apple-style rich toast
- Default: white bg, shadow-lg, left icon + message
- Success: Green dot / check
- Error: Red dot

---

## 8. Layout Choreography

### Page structure
```
┌─ Page Header ───────────────────────┐
│ Title (text-xl)                     │
│ Description (text-sm, text-secondary)│
└─────────────────────────────────────┘
┌─ Content ───────────────────────────┐
│ (3-column responsive grid:          │
│  1fr on mobile,                     │
│  2fr on tablet,                     │
│  3fr on lg desktop)                 │
│  gap-5 on all breakpoints           │
│  max-w-7xl centered                 │
└─────────────────────────────────────┘
```

### Responsive breakpoints
- Mobile: < 640px (single column, bottom nav)
- Tablet: 640-1024px (2 col, bottom nav on < 1024px)
- Desktop: >= 1024px (sidebar + 3 col)

### KPI Dashboard row
- 3 cards in a row, each with icon (24px) + text + numeric value (text-lg weight-650)
- Compact: icon + value side by side, label below

---

## 9. Implementation Order

1. `globals.css` — define all CSS tokens, keyframes, utilities
2. UI primitives — button, card, badge, input, textarea, dialog, sheet, tabs, select, separator, scroll-area, skeleton, avatar, label, progress, dropdown-menu, bottom-sheet
3. layout components — sidebar, mobile-nav, dashboard-layout
4. Auth pages — login, forgot-password, verify-reset-code, set-password, change-password
5. Officer pages — events list, event detail client, reports list, report detail, notifications, profile
6. Adviser pages — event detail client, pending approvals, report detail
7. Admin pages — departments list, dept layout, events, audit-logs, reports, users
8. Shared components — budget-chart, notifications-page, profile-page, camera-capture, upload-sheet, viewfinder-overlay
