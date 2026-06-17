import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

// Convención Next 15.5+/16: proxy.ts reemplaza a middleware.ts.
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Todo salvo estáticos: la sesión debe refrescarse también en la web pública.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
