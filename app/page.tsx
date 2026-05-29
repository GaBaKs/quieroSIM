import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import HowItWorks from '@/components/sections/HowItWorks';
import Destinations from '@/components/sections/Destinations';
import Compatibility from '@/components/sections/Compatibility';
import AboutUs from '@/components/sections/AboutUs';
import Testimonials from '@/components/sections/Testimonials';
import FAQ from '@/components/sections/FAQ';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-850 antialiased flex flex-col justify-between" id="landing-page-root">
      {/* Header Navigation */}
      <Navbar />

      {/* Main Sections flow */}
      <main className="flex-grow">
        <Hero />
        <HowItWorks />
        <Destinations />
        <Compatibility />
        <AboutUs />
        <Testimonials />
        <FAQ />
      </main>

      {/* Trustable Stripe and LLC descriptive footer */}
      <Footer />
    </div>
  );
}
