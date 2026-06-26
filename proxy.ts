import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Convención Next 15.5+/16: proxy.ts reemplaza a middleware.ts.
export default async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Atribución de afiliado: si la URL trae ?aff=<referral_link>, lo guardamos en
  // una cookie (30 días) que el checkout lee para atribuir la venta. El monto y la
  // resolución real del afiliado se validan server-side; esto es solo el "quién".
  const aff = request.nextUrl.searchParams.get('aff');
  if (aff && /^[A-Za-z0-9_-]{1,64}$/.test(aff)) {
    response.cookies.set('qs_aff', aff, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  // Todo salvo estáticos: la sesión debe refrescarse también en la web pública.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
