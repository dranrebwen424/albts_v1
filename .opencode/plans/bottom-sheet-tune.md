# Bottom Sheet Animation Tuning

## File 1: `src/components/camera/upload-sheet.tsx`

### Change 1 — Entrance spring (line 14)
```diff
- const springSheet = { stiffness: 500, damping: 45, mass: 1.1 };
+ const springSheet = { stiffness: 600, damping: 50, mass: 0.9 };
```

### Change 2 — Exit transition (lines 39-42)
```diff
- initial={{ y: '100%' }}
- animate={{ y: 0 }}
- exit={{ y: '100%' }}
- transition={springSheet}
+ initial={{ y: '100%' }}
+ animate={{ y: 0 }}
+ exit={{ y: '40%', opacity: 0.8 }}
+ transition={{ ...springSheet, exit: { duration: 0.15, ease: [0.33, 1, 0.68, 1] } }}
```

Exit now drops only 40% down (not full), fades slightly, in 150ms (feels instant).

---

## File 2: `src/components/ui/bottom-sheet.tsx`

### Change 1 — Reduce mass (line 13)
```diff
- const springSheet = { stiffness: 500, damping: 45, mass: 1.1 };
+ const springSheet = { stiffness: 500, damping: 45, mass: 0.85 };
```

### Change 2 — Remove backdrop blur (line 38)
```diff
- className="absolute inset-0 bg-black/[0.1] backdrop-blur-sm"
+ className="absolute inset-0 bg-black/[0.1]"
```

`backdrop-filter: blur()` causes frame drops on mobile — removing it eliminates the main source of lag.

### Change 3 — More responsive drag (line 48)
```diff
- dragElastic={0.15}
+ dragElastic={0.2}
```
