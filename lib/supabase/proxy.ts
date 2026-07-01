import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la sesión Supabase en cada request (patrón updateSession de
 * @supabase/ssr) y protege /admin/* y /account/*: sin usuario → redirect al
 * login que corresponda. El chequeo de ROL admin vive en
 * app/admin/(panel)/layout.tsx; acá solo se exige sesión (el proxy corre en
 * cada request, mejor mantenerlo barato).
 */

/** Rutas bajo /admin accesibles sin sesión (login y flujo de recovery). */
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/update-password'];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
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
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: getUser() valida el JWT contra Supabase (no confiar en getSession aquí).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect que PRESERVA las cookies refrescadas por getUser() (rotación de
  // token / limpieza de sesión). Sin esto, el redirect descartaba las cookies
  // nuevas y el cliente quedaba desincronizado hasta un reload duro (F5).
  const redirectPreservingCookies = (pathname: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const path = request.nextUrl.pathname;
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  const isPublicAdminRoute = PUBLIC_ADMIN_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (isAdminRoute && !isPublicAdminRoute && !user) {
    return redirectPreservingCookies('/admin/login');
  }

  // Panel del usuario final ("Mis eSIMs"): exige sesión, sin chequeo de rol.
  const isAccountRoute = path === '/account' || path.startsWith('/account/');
  if (isAccountRoute && !user) {
    return redirectPreservingCookies('/login');
  }

  return supabaseResponse;
}
