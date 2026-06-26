import type { Metadata } from 'next';
import PrivacyPolicyView from '@/components/legal/privacy/PrivacyPolicyView';

export const metadata: Metadata = {
  title: 'Política de Privacidad | QuieroSIM',
  description: 'Política de Privacidad y protección de datos personales de QuieroSIM (QUIERO LLC) según el GDPR, CCPA y regulaciones de telecomunicaciones.',
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyView />;
}
