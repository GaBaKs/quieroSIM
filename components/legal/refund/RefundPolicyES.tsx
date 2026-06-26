import { RefreshCw } from 'lucide-react';
export default function RefundPolicyES() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:p-12">
          {/* Document Header */}
          <div className="border-b border-slate-100 pb-8 text-center sm:text-left">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600 sm:mx-0">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h1 className="mt-4 font-sans text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Política de Reembolso
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Última actualización: 22 de mayo de 2026 · Válido para QUIERO LLC
            </p>
          </div>

          {/* Document Body */}
          <div className="prose prose-slate mt-8 max-w-none space-y-6 text-slate-600 leading-relaxed text-sm sm:text-base">
            <p>
              En <strong>QuieroSIM</strong>, operada por <strong>QUIERO LLC</strong> (en adelante &quot;la Empresa&quot;, &quot;nosotros&quot; o &quot;nuestro&quot;), nos esforzamos por brindar una conectividad internacional óptima para su viaje. Debido a que las tarjetas SIM virtuales (eSIM) constituyen bienes digitales empaquetados e intangibles de descarga única e inmediata, las políticas de devolución difieren de la compra de productos físicos tradicionales.
            </p>
            <p>
              Nuestra meta es maximizar la satisfacción del viajero a la vez que se operan esquemas justos, claros y alineados con las reglas internacionales de las marcas emisoras de tarjetas de crédito y procesadores oficiales como Stripe.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              1. Casos Admitidos para Reembolso del 100%
            </h2>
            <p>
              Usted será elegible para una devolución completa e inmediata del total cobrado bajo las siguientes condiciones debidamente verificadas:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Cancelación u Olvido previo a la descarga (eSIM sin tocar):</strong> Si usted compró accidentalmente un plan eSIM o sus planes de viaje variaron permanentemente, y <strong>no ha escaneado ni descargado el perfil digital en ningún dispositivo celular</strong>. Una vez emitido el Código QR, nuestro servidor puede auditar si el perfil ha sido iniciado o instalado en un hardware, si está libre, califica para el reintegro.</li>
              <li><strong>Falla técnica técnica no resuelta por nuestro soporte:</strong> Si durante su llegada al país de destino contratado, experimenta una falla total de conectividad móvil, y tras entablar comunicación legítima con nuestro canal de Soporte por correo al menos durante veinticuatro (24) horas, nuestro equipo de ingenieros de red no logra resolver la situación técnica y se confirma un error imputable a nuestro perfil eSIM o red proveedora local.</li>
              <li><strong>Plan agotado por error de sistema:</strong> Si por un error interno fortuito en nuestro stock digital, el Código QR de su eSIM no pudiera generarse y enviarse en un plazo máximo de veinticuatro (24) horas desde la validación del cobro exitoso por parte de Stripe.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              2. Casos No Elegibles para Reembolso
            </h2>
            <p>
              Lamentablemente, no podemos procesar devoluciones o reintegros bajo las situaciones especificadas a continuación por ser ajenas a la operatividad de nuestra plataforma:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Incompatibilidad o Bloqueo del Dispositivo:</strong> Si se comprueba que el teléfono inteligente del usuario no admite la tecnología eSIM o se encuentra bloqueado por la compañía telefónica local de origen (dispositivo con bloqueo de operadora de red). Es responsabilidad absoluta de cada cliente revisar la lista de compatibilidad antes de finalizar la transacción de cobro.</li>
              <li><strong>Eliminación fortuita del perfil eSIM:</strong> Una vez que un perfil eSIM es instalado y descargado del sistema en el chip digital interno del dispositivo móvil, no puede reutilizarse ni descargarse en otro teléfono. Si usted borra accidentalmente el perfil de la configuración de su teléfono durante su viaje, la eSIM queda permanentemente inutilizada. No podemos emitir un reembolso ni un nuevo perfil de forma gratuita en este caso.</li>
              <li><strong>Errores de Red ajenos y temporales:</strong> Falta de señal transitoria por factores geográficos particulares de destino, catástrofes de clima natural, limitaciones temporales de tránsito terrestre, o si no se tiene configurada la opción obligatoria de de &quot;Roaming de Datos&quot; o &quot;Itinerancia&quot; activa en el dispositivo para que funcione el servicio en roaming.</li>
              <li><strong>Datos parciales ya consumidos:</strong> Una vez que el usuario ha consumido por encima de doscientos megabytes (200MB) de datos del plan prepago, el servicio se considera correctamente iniciado e ineluctablemente entregado de forma total, por lo que no es elegible para reembolso bajo ningún concepto.</li>
            </ul>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              3. Procedimiento para Solicitar un Reembolso
            </h2>
            <p>
              Para iniciar una solicitud formal de revisión de reembolso, siga el siguiente proceso:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Envíe un mensaje al correo electrónico oficial: <strong>support@quierosim.com</strong>.</li>
              <li>Coloque como asunto del mensaje: <code>&quot;Solicitud de Reembolso - Orden #[Número de Orden] - Nombre Completo&quot;</code>.</li>
              <li>Describa las razones detalladas por las cuales requiere la devolución técnica o de cancelación de viaje.</li>
              <li>Para quejas sobre fallas técnicas en el destino, es requisito indispensable adjuntar capturas de pantalla de la pantalla de su teléfono donde se demuestre:
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>La configuración activa de la eSIM (Pantalla de Planes de Datos / Red celular).</li>
                  <li>Las opciones de &quot;Roaming de Datos&quot; o &quot;Itinerancia&quot; encendidas.</li>
                  <li>El indicador superior de barras de cobertura celular y señal de la antena.</li>
                </ul>
              </li>
            </ol>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              4. Plazos de Procesamiento Financiero
            </h2>
            <p>
              Nuestro equipo legal evaluará y responderá a su solicitud en un período promedio máximo de cuarenta y ocho (48) horas hábiles. 
              Si el reembolso es aprobado solemnemente por nuestro sistema, la instrucción se enviará de inmediato al panel financiero de <strong>Stripe</strong>. El monto se devolverá de forma directa a la misma tarjeta de crédito o débito utilizada para realizar la compra original. 
              Dependiendo de los plazos interbancarios específicos de cada entidad bancaria local emisora exterior, la transacción se reflejará reflejada en su extracto bancario en un lapso estimado de cinco (5) a diez (10) días hábiles posteriores.
            </p>

            <h2 className="font-sans text-lg sm:text-xl font-bold text-slate-900 mt-6 md:mt-8 border-l-4 border-teal-500 pl-3">
              5. Contacto Legal del Proveedor
            </h2>
            <p>
              Para cualquier cuestión aclaratoria sobre estas políticas comerciales de devolución:
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-5 text-xs sm:text-sm text-slate-700 space-y-1">
              <p>🏛️ <strong>Lector Corporativo:</strong> QUIERO LLC</p>
              <p>📍 <strong>Domicilio de Operaciones:</strong> 1000 Brickell Avenue, Suite #715 PMB 153, Miami, Florida 33131, Estados Unidos</p>
              <p>📧 <strong>E-mail de Apoyo al Cliente:</strong> support@quierosim.com</p>
            </div>
          </div>
        </div>
      </main>
  );
}
