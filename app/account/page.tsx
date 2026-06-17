import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/server/db/supabase-server';
import { claimMyOrders, getMyEsims } from '@/server/actions/esims';
import MyEsims from '@/components/account/MyEsims';

/**
 * "Mis eSIMs": al cargar, reclama las compras guest hechas con el email del
 * usuario (claim_my_orders, idempotente) y lista sus eSIMs. El refresco en
 * vivo (estado/consumo) lo maneja el componente cliente vía Realtime.
 */
export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await claimMyOrders();
  const result = await getMyEsims();
  const esims = result.ok ? result.data : [];

  return <MyEsims initialEsims={esims} userId={user.id} />;
}
