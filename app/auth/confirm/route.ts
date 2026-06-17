import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/server/db/supabase-server';

/**
 * Punto de aterrizaje de los links de email de Supabase Auth (confirmación de
 * signup, recovery, invitaciones). Soporta los DOS flujos que puede mandar
 * Supabase según la config del proyecto y el template de email:
 *  - PKCE: el link trae `?code=...` → exchangeCodeForSession. Es el default de
 *    @supabase/ssr (template con {{ .ConfirmationURL }}). Requiere abrir el
 *    link en el MISMO navegador donde se registró (el code_verifier está en
 *    una cookie).
 *  - token_hash: el link trae `?token_hash=...&type=...` → verifyOtp. Funciona
 *    cross-device; requiere un template de email con {{ .TokenHash }}.
 * En ambos casos deja la sesión en cookies y manda a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextPath = searchParams.get('next') ?? '/';

  const supabase = await createSupabaseServerClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) {
    redirect(nextPath);
  }

  // Link inválido/vencido (o abierto en otro navegador en el flujo PKCE):
  // volver al login que corresponda según el destino.
  redirect(nextPath.startsWith('/admin') ? '/admin/login?error=invalid_link' : '/login?error=invalid_link');
}
