# Fix: Page loads then redirects back to previous page

## Root Cause

Redundant client-side auth checks in two components fire `router.push('/login')` when the client-side `supabase.auth.getUser()` fails to find the session cookie. This creates a redirect loop:

1. Middleware (server-side) validates session → passes
2. Page renders briefly
3. Client-side `DashboardLayout` mounts, calls `supabase.auth.getUser()`
4. If the auth cookie isn't accessible from JS (`document.cookie`), `getUser()` returns `null`
5. `router.push('/login')` fires → navigates away
6. Middleware catches `/login`, sees valid session → redirects back to role home
7. User ends up on the wrong page or a redirect loop

## Changes

### File 1: `src/components/layout/dashboard-layout.tsx`

**Remove** the `if (!user) { router.push('/login'); return; }` block (lines 36-39). Change to `if (!user) return;` — just silently skip profile loading. The middleware already protects routes.

Also remove `router` from the dependency array since it's no longer used.

**Diff:**
```tsx
// Before (lines 31-54):
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setProfile(profile as any);
        }
      } catch {}
    };

    initAuth();
  }, [router, setProfile]);

// After:
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setProfile(profile as any);
        }
      } catch {}
    };

    initAuth();
  }, [setProfile]);
```

### File 2: `src/app/(dashboard)/admin/departments/[deptId]/layout.tsx`

Remove the same redundant redirect. **Diff:**
```tsx
// Before (lines 27-38):
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const depts = await getDepartments();
      const dept = depts.find((d: any) => d.id === params.deptId);
      if (dept) setDeptName(dept.name);
      setLoading(false);
    };
    init();
  }, [params.deptId, router]);

// After:
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const depts = await getDepartments();
      const dept = depts.find((d: any) => d.id === params.deptId);
      if (dept) setDeptName(dept.name);
      setLoading(false);
    };
    init();
  }, [params.deptId]);
```

## Verification

- Navigate between pages in the dashboard — should stay on the target page
- Test with slow network (DevTools → Network → Slow 3G) to simulate race conditions
- The sidebar, events list, and all protected pages should load without bouncing back
