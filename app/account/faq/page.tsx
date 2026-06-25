import FAQ from '@/components/sections/FAQ';

export const metadata = {
  title: 'Preguntas Frecuentes | Mi Cuenta',
};

export default function AccountFAQPage() {
  return (
    <div className="space-y-6">
      <FAQ plainMode={true} />
    </div>
  );
}
