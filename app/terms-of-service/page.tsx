import type { Metadata } from 'next';
import TermsOfServiceView from '@/components/legal/terms/TermsOfServiceView';

export const metadata: Metadata = {
  title: 'Términos de Servicio | QuieroSIM',
  description: 'Condiciones de uso y contratación del servicio de eSIM provisto por QUIERO LLC.',
};

export default function TermsOfServicePage() {
  return <TermsOfServiceView />;
}
