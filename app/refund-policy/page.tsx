import type { Metadata } from 'next';
import RefundPolicyView from '@/components/legal/refund/RefundPolicyView';

export const metadata: Metadata = {
  title: 'Política de Reembolso | QuieroSIM',
  description: 'Términos y condiciones detallados para solicitar la devolución o cancelación del servicio digital de eSIM provisto por QUIERO LLC.',
};

export default function RefundPolicyPage() {
  return <RefundPolicyView />;
}
