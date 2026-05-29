'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { motion } from 'motion/react';
import { Linkedin, Mail } from 'lucide-react';
import Image from 'next/image';

import felipeImg from '@/images/felipe-babenco.jpeg';

export default function AboutUs() {
  const { fadeUp } = useScrollReveal();

  return (
    <section className="py-20 md:py-32 bg-white text-zinc-900 relative overflow-hidden" id="about">
      {/* Background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#b3ff6b]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 xl:px-24 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-sans font-medium tracking-tight mb-4">
            Quiénes Somos
          </h2>
          <div className="w-16 h-1 bg-[#b3ff6b] mx-auto rounded-full" />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          
          {/* Image Column */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="md:col-span-5 flex justify-center md:justify-end"
          >
            <div className="relative w-72 h-72 md:w-80 md:h-80 xl:w-96 xl:h-96 shrink-0 group">
              <div className="absolute inset-0 bg-[#b3ff6b] rounded-3xl rotate-3 group-hover:rotate-6 transition-transform duration-500 opacity-20" />
              <div className="absolute inset-0 bg-zinc-200 rounded-3xl -rotate-3 group-hover:-rotate-6 transition-transform duration-500 shadow-xl border border-black/5" />
              
              <div className="absolute inset-0 rounded-3xl overflow-hidden bg-white z-10 border border-black/10">
                {/* Fallback pattern while image is missing / placeholder */}
                <Image 
                  src={felipeImg} 
                  alt="Felipe Babenco - CEO & Co-Founder" 
                  fill
                  referrerPolicy="no-referrer"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Fallback content in case image doesn't load/exist yet */}
                <div className="absolute inset-0 flex items-center justify-center -z-10 bg-zinc-100">
                  <span className="text-zinc-400 text-xs">FOTO PROFESIONAL</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Text Column */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } },
            }}
            className="md:col-span-7 flex flex-col space-y-6"
          >
            <div>
              <h3 className="text-3xl font-bold font-sans tracking-tight text-zinc-900 mb-1">
                Felipe Babenco
              </h3>
              <p className="text-[#9933c1] tracking-wider text-sm uppercase">
                CEO & Co-Founder
              </p>
            </div>

            <div className="space-y-4 text-zinc-500 font-sans leading-relaxed text-lg">
              <p>
                Emprendedor argentino y fundador de múltiples proyectos vinculados a tecnología, logística y experiencias para viajeros.
              </p>
              <p>
                Felipe es también cofundador de <span className="text-zinc-900 font-medium">Tu Traslado</span>, una de las empresas de transporte para eventos y turismo más reconocidas de Argentina, movilizando miles de pasajeros en festivales, recitales y experiencias de viaje en todo el país.
              </p>
              <p>
                Con una fuerte visión comercial y enfoque en experiencia de usuario, lidera el desarrollo estratégico de QUIERO con el objetivo de construir una marca global de conectividad digital para viajeros.
              </p>
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}
