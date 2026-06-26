import { FileText } from 'lucide-react';
import Link from 'next/link';
export default function TermsOfServiceES() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:p-12">
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-8 text-center sm:text-left">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 sm:mx-0">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Términos de Servicio
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Última actualización: 22 de mayo de 2026 · Válido para QUIERO LLC
            </p>
          </div>

          {/* Document Body */}
          <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-600 leading-relaxed text-sm sm:text-base">
            <p>
              Bienvenido a <strong>QuieroSIM</strong>. Estos Términos y Condiciones de Servicio (en adelante &quot;Términos&quot;) regulan el uso de nuestro sitio web y la adquisición y uso de perfiles de tarjetas SIM virtuales (eSIM) proporcionados por la empresa legal <strong>QUIERO LLC</strong> (en adelante &quot;la Empresa&quot;, &quot;nosotros&quot;, &quot;nuestro&quot;).
            </p>
            <p className="border-l-4 border-amber-500 bg-amber-50/50 p-4 text-xs sm:text-sm text-amber-800">
              ⚠️ <strong>AVISO CRÍTICO AL COMPRADOR:</strong> Al comprar cualquiera de nuestras eSIMs, usted declara y certifica de manera irrevocable que su dispositivo móvil (smartphone, tablet, etc.) es <strong>compatible con la tecnología eSIM y que está completamente desbloqueado para uso de cualquier operador telefónico</strong> de fábrica. La Empresa no se responsabiliza ni reembolsa compras de dispositivos bloqueados o incompatibles.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              1. Descripción de los Servicios y Objeto del Contrato
            </h2>
            <p>
              QuieroSIM ofrece la provisión puramente digital de perfiles de telecomunicaciones basados en tecnología eSIM para la descarga directa en dispositivos móviles personales compatibles de los usuarios. Estos perfiles otorgan servicios temporales de datos de internet celular (servicios móviles inalámbricos prepagos) en las redes locales asociadas descritas según el plan de destino comprado.
            </p>
            <p>
              A menos que se especifique de forma inequívoca en un folleto de plan premium particular, el servicio eSIM es exclusivamente de <strong>datos inalámbricos prepago de descarga única</strong>, lo que significa que no incluye número telefónico de marcación directa tradicional (MSISDN), ni servicios de minutos analógicos para llamadas analógicas o envío/recepción de mensajes de texto SMS tradicionales.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              2. Precios y Condiciones de Pago
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Todos los valores se expresan y facturan estrictamente en dólares estadounidenses (USD) de forma exclusiva.</li>
              <li>Nuestros cobros corresponden a un esquema de <strong>pago único digital de prepago</strong>. No existen costos ocultos de roaming, suscripciones periódicas encubiertas, tarifas recurrentes mensuales de recargo, ni cargos adicionales retroactivos posteriores al cese de su viaje de turismo.</li>
              <li>Los pagos se procesan de forma externa a través del portal cifrado de <strong>Stripe</strong>. Su conexión a internet con nuestro gateway de cobro está protegida de extremo a extremo mediante capas criptográficas SSL.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              3. Entrega y Activación del Perfil de Datos
            </h2>
            <p>
              Inmediatamente después de que Stripe procese el pago con resultado exitoso, nuestro sistema central generará automáticamente el Perfil de Datos eSIM empaquetado y lo enviará al correo electrónico especificado en el formulario. 
              La entrega se efectúa de manera formal a través de un <strong>Código QR (Quick Response)</strong> único junto con la clave de activación manual alfanumérica y un manual didáctico detallado paso a paso en idioma español. El período promedio esperado de entrega por mail es menor a tres (3) minutos.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              4. Responsabilidades Propias del Viajero
            </h2>
            <p>
              Al hacer uso de nuestro perfil eSIM, usted se compromete explícitamente a:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>No utilizar el servicio de telecomunicaciones de forma ilícita, fraudulenta con herramientas de intrusión de red, o de cualquier manera prohibida por las leyes locales de soberanía del país de destino.</li>
              <li>Garantizar que cuenta con cobertura local celular activa durante el viaje para que la red funcione de acuerdo a la capacidad local provista por los operadores telefónicos de destino (ej: T-Mobile, Movistar, Vodafone).</li>
              <li>No intentar clonar ni descargar el Código QR de la eSIM en múltiples teléfonos a la vez. Cada eSIM es de <strong>única instalación</strong> y queda enlazada de forma permanente al hardware del chip virtual de su dispositivo físico al escanearse.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              5. Derecho de Reembolso y Cancelación
            </h2>
            <p>
              Debido a la naturaleza inmediata e irreversible de los productos digitales recargados y perfiles móviles descargados, se aplican términos específicos de devolución. Consulte nuestra <Link href="/refund-policy" className="text-teal-600 underline font-medium hover:text-teal-800">Política de Reembolso</Link> completa que forma parte indisoluble de este acuerdo integral.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              6. Limitación de Responsabilidad de la Empresa
            </h2>
            <p>
              QUIERO LLC ofrece las eSIMs bajo la modalidad de &quot;esfuerzos comercialmente viables&quot; y depende estrictamente de los operadores de telefonía móvil locales con licencia oficial en cada país. 
              No seremos responsables de cortes fortuitos locales, áreas ciegas geográficas sin señal, interferencias atmosféricas naturales, fallas transitorias de las redes públicas locales, o congestión telefónica temporal en aeropuertos, estadios o puntos remotos.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              7. Ley Aplicable y Jurisdicción Legal
            </h2>
            <p>
              Cualquier controversia, disputa o reclamación que surja del uso del sitio web o contratación del servicio móvil eSIM estará sujeta y se interpretará de conformidad con las leyes del Estado de Wyoming, Estados Unidos de América, sin dar efecto a ninguna de las normas sobre conflictos de leyes de su foro de residencia. Ambas partes se someten a la competencia judicial exclusiva de las cortes radicadas en Wyoming o Miami, Florida.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              8. Modificaciones al Convenio
            </h2>
            <p>
              La Empresa se reserva el derecho exclusivo de actualizar y reformular total o parcialmente estos Términos en cualquier momento para adaptarlos a regulaciones de seguridad o cambios operativos en el sector de telecomunicaciones globales. Publicaremos la última fecha de revisión en la parte superior de esta página.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              9. Datos de Contacto Corporativo
            </h2>
            <p>
              Para soporte comercial urgente, quejas sobre consumos de datos o facturaciones:
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-xs sm:text-sm text-slate-700 space-y-1">
              <p>🏢 <strong>Nombre Legal:</strong> QUIERO LLC</p>
              <p>📍 <strong>Dirección Fiscal:</strong> 1000 Brickell Avenue, Suite #715 PMB 153, Miami, Florida 33131, Estados Unidos (sociedad constituida en el Estado de Wyoming)</p>
              <p>📩 <strong>Soporte al Cliente:</strong> support@quierosim.com</p>
              <p>💬 <strong>Canal Adicional:</strong> Formulario oficial o botón interactivo en la página principal</p>
            </div>
          </div>
        </div>
      </main>
  );
}
