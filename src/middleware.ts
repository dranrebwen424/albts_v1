import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes — only redirect non-logged-in users, not on /login
  if (!user) {
    const isProtected = ['/officer', '/adviser', '/admin'].some(path =>
      request.nextUrl.pathname.startsWith(path)
    );
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // If logged in and visiting login — use user_metadata to avoid a DB query
  if (user && request.nextUrl.pathname === '/login') {
    const role = user.user_metadata?.role as string | undefined;
    const url = request.nextUrl.clone();
    switch (role) {
      case 'officer':
        url.pathname = '/officer/events';
        break;
      case 'adviser':
        url.pathname = '/adviser/events';
        break;
      case 'admin':
        url.pathname = '/admin/departments';
        break;
      default:
        return supabaseResponse; // stay on /login if role unknown
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/officer/:path*', '/adviser/:path*', '/admin/:path*', '/login'],
};
