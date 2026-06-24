import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import HowItWorks from '@/components/sections/HowItWorks';
import Destinations from '@/components/sections/Destinations';
import Compatibility from '@/components/sections/Compatibility';
import Comparison from '@/components/sections/Comparison';
import AboutUs from '@/components/sections/AboutUs';
import Testimonials from '@/components/sections/Testimonials';
import FAQ from '@/components/sections/FAQ';
import { getCatalog, getSupportedDevices } from '@/server/services/catalog';
import CatalogRealtime from '@/components/CatalogRealtime';

// ISR: el catálogo se revalida cada 30 min (el cron de sync corre a diario).
export const revalidate = 1800;

export default async function Home() {
  const [catalog, devices] = await Promise.all([getCatalog(), getSupportedDevices()]);

  return (
    <div className="min-h-screen bg-white text-slate-850 antialiased flex flex-col justify-between" id="landing-page-root">
      {/* Realtime: refresca el catálogo cuando el admin cambia precios/planes */}
      <CatalogRealtime />
      {/* Header Navigation */}
      <Navbar />

      {/* Main Sections flow */}
      <main className="flex-grow">
        <Hero />
        <HowItWorks />
        <Destinations destinations={catalog.destinations} plansByDestination={catalog.plansByDestination} />
        <Compatibility devices={devices} />
        <Comparison />
        <AboutUs />
        <Testimonials />
        <FAQ />
      </main>

      {/* Trustable Stripe and LLC descriptive footer */}
      <Footer />
    </div>
  );
}
