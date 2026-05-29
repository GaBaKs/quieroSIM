import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad | QuieroSIM',
  description: 'Política de Privacidad y protección de datos personales de QuieroSIM (QUIERO LLC) según el GDPR, CCPA y regulaciones de telecomunicaciones.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased" id="privacy-policy-view">
      {/* Mini header/Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-sans font-bold text-slate-900 text-lg sm:text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3ff6b] text-black shadow-md">
              <Check className="h-4 w-4 stroke-[3.5]" />
            </div>
            <span className="font-sans font-black text-xl tracking-tight">
              <span className="text-[#9933c1]">Quiero</span><span className="text-[#b3ff6b]">SIM</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:p-12">
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-8 text-center sm:text-left">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 sm:mx-0">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Política de Privacidad
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Última actualización: 22 de mayo de 2026 · Válido para QUIERO LLC
            </p>
          </div>

          {/* Document Body */}
          <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-600 leading-relaxed text-sm sm:text-base">
            <p>
              En <strong>QuieroSIM</strong> (marca operada por <strong>QUIERO LLC</strong>, en adelante &quot;la Empresa&quot;, &quot;nosotros&quot;, o &quot;nuestro&quot;), la privacidad y protección de los datos personales de nuestros usuarios es de suma importancia. 
              Esta Política de Privacidad describe cómo recopilamos, utilizamos, almacenamos y protegemos su información de conformidad con las principales leyes de privacidad aplicables, incluyendo el Reglamento General de Protección de Datos (GDPR), la Ley de Privacidad del Consumidor de California (CCPA) y los marcos internacionales de telecomunicaciones.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              1. Datos Personales que Recopilamos
            </h2>
            <p>
              Para facilitarle una eSIM digital para su viaje y procesar su compra, solicitamos y recopilamos los siguientes datos de carácter personal:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Datos de contacto básicos:</strong> Nombre, dirección de correo electrónico y número de teléfono. El correo electrónico es crítico ya que allí enviaremos el Código QR y las instrucciones de instalación del perfil eSIM.</li>
              <li><strong>Datos de pago:</strong> Número de tarjeta, fecha de vencimiento y código CVC. <em>Nota importante:</em> Todos los pagos son procesados de forma cifrada y segura por <strong>Stripe, Inc.</strong> Nosotros no almacenamos ni tenemos acceso directo a los números completos de su tarjeta de crédito.</li>
              <li><strong>Información técnica del dispositivo:</strong> Marca y modelo de su smartphone para verificar la compatibilidad del dispositivo con nuestra tecnología eSIM.</li>
              <li><strong>Ubicación aproximada de conexión:</strong> Únicamente para fines técnicos relacionados con el aprovisionamiento de las redes de datos móviles de destino contratadas por el usuario.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              2. Finalidad del Tratamiento de los Datos
            </h2>
            <p>
              Utilizamos la información recopilada para las siguientes finalidades legítimas inherentes al negocio de telecomunicaciones turísticas:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Aprovisionar, entregar y activar el perfil eSIM digital mediante el envío seguro del código QR.</li>
              <li>Procesar con éxito las transacciones financieras y prevenir fraudes a través del portal protegido de Stripe.</li>
              <li>Prestar soporte técnico post-venta prioritario las 24 horas del día (resolución de fallas de conexión o dudas sobre activación).</li>
              <li>Enviar anuncios administrativos relacionados con el estado de su plan de datos (notificación de consumo de datos, recordatorios de vencimiento de días y ofertas de recarga).</li>
              <li>Cumplir con las obligaciones legales y de regulación aplicables a los proveedores de telecomunicaciones locales.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              3. Intercambio de Información con Terceros
            </h2>
            <p>
              La Empresa bajo ninguna circunstancia vende, alquila ni comercializa la información personal de sus usuarios. Únicamente compartimos sus datos con los siguientes proveedores de servicios indispensables bajo estrictos estándares de confidencialidad:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Stripe, Inc:</strong> Operador exclusivo de pagos seguros de tarjeta.</li>
              <li><strong>Operadores de Redes Locales:</strong> Asociados globales de telecomunicaciones únicamente para registrar el uso de datos en el país de destino. No se transfiere ningún dato identificativo personal sensible superfluo.</li>
              <li><strong>Proveedores de Alojamiento y Entrega:</strong> Servidores en la nube seguros para el envío automático de correos (ej: Amazon Web Services o Sendgrid).</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              4. Transferencia de Datos Internacionales y Seguridad
            </h2>
            <p>
              Nuestra base de datos se almacena en centros de datos ubicados en Estados Unidos y la Unión Europea que emplean estrictas medidas técnicas, organizativas y físicas para neutralizar intrusiones no autorizadas. Toda la transmisión de datos se realiza bajo cifrado de capa de conexión segura SSL de 256 bits (HTTPS).
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              5. Sus Derechos de Privacidad (GDPR & CCPA)
            </h2>
            <p>
              Usted tiene pleno derecho sobre el destino y alcance de sus datos personales. Puede enviarnos una solicitud por correo electrónico para ejercer los siguientes derechos amparados por la ley:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Acceso y Portabilidad:</strong> Solicitar una copia digital de los datos personales almacenados en nuestros servidores.</li>
              <li><strong>Rectificación:</strong> Solicitar la corrección de datos incorrectos (por ejemplo, corrección de un email escrito incorrectamente al comprar).</li>
              <li><strong>Supresión (Derecho al Olvido):</strong> Solicitar la eliminación total de sus antecedentes y datos personales en la medida en que no interfiera con leyes de telecomunicaciones obligatorias.</li>
              <li><strong>Oposición:</strong> Cancelar cualquier comunicación sobre ofertas o sugerencias sobre futuros destinos.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              6. Cookies y Seguimiento Visual
            </h2>
            <p>
              Utilizamos cookies fundamentales en nuestro sitio web únicamente para fines operativos del carro de compras, análisis de rendimiento anónimo, y para recordar su preferencia del destino seleccionado en sus búsquedas pasadas.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              7. Datos de Contacto de la Entidad Responsable
            </h2>
            <p>
              Para consultas, quejas o para ejercer cualquiera de sus derechos, puede contactarse directamente al canal oficial de la LLC responsable:
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-xs sm:text-sm text-slate-700 space-y-1">
              <p>🟢 <strong>Operador Legal:</strong> QUIERO LLC</p>
              <p>📍 <strong>Dirección Fiscal:</strong> 1000 Brickell Avenue, Suite #715 PMB 153, Miami, Florida 33131, Estados Unidos</p>
              <p>✉️ <strong>Email Directo de Privacidad:</strong> support@quierosim.com</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
