/**
 * Plantillas de email transaccional (HTML inline-styles, apto clientes de mail).
 * El QR va incrustado como adjunto inline: `<img src="cid:QR_CONTENT_ID">` —
 * el PNG se genera con qr-png.ts y se adjunta con ese contentId.
 * ⚠️ El HTML contiene el LPA (secreto): jamás loguear el resultado del render.
 */

export type EmailLang = 'ES' | 'EN' | 'PT';

export const QR_CONTENT_ID = 'esim-qr';

export interface QrEmailData {
  lang: EmailLang;
  /** Nombre comercial del plan, ej. "eSIM Estados Unidos 5GB". */
  planName: string;
  /** String de activación LPA (va como texto copiable y codificado en el QR). */
  lpa: string;
  iosTapLink: string | null;
  /** Id corto de la orden para referencia del cliente. */
  orderShortId: string;
}

interface QrCopy {
  subject: (plan: string) => string;
  preheader: string;
  title: string;
  intro: (plan: string) => string;
  scanTitle: string;
  scanDesc: string;
  manualTitle: string;
  manualDesc: string;
  iosBtn: string;
  stepsTitle: string;
  steps: [string, string, string];
  keepTitle: string;
  keepDesc: string;
  order: string;
  footer: string;
}

const COPY: Record<EmailLang, QrCopy> = {
  ES: {
    subject: (plan) => `Tu ${plan} está lista — escaneá el QR para instalarla`,
    preheader: 'Tu eSIM llegó: instalala en un minuto escaneando el código QR.',
    title: '¡Tu eSIM está lista! 🎉',
    intro: (plan) => `Gracias por tu compra. Acá está tu <strong>${plan}</strong>, lista para instalar.`,
    scanTitle: 'Escaneá este QR desde otro dispositivo',
    scanDesc: 'Abrí la cámara del teléfono donde vas a instalar la eSIM y escaneá el código (necesitás verlo desde otra pantalla o imprimirlo).',
    manualTitle: 'O ingresá el código manualmente',
    manualDesc: 'En Ajustes → Datos móviles → Agregar eSIM → "Usar código de activación", pegá:',
    iosBtn: 'Instalación con un toque (iPhone)',
    stepsTitle: 'Cómo instalarla',
    steps: [
      'Andá a Ajustes → Datos móviles / Conexiones.',
      'Elegí "Agregar eSIM" y escaneá el QR (o pegá el código).',
      'Activá el roaming de datos para la eSIM al llegar a destino.',
    ],
    keepTitle: 'Guardá este email',
    keepDesc: 'Vas a necesitar el QR para instalar la eSIM. Si la borrás del teléfono, este mismo código te sirve para reinstalarla.',
    order: 'Orden',
    footer: 'Operado por QUIERO LLC · Soporte: respondé este email y te ayudamos.',
  },
  EN: {
    subject: (plan) => `Your ${plan} is ready — scan the QR to install it`,
    preheader: 'Your eSIM has arrived: install it in a minute by scanning the QR code.',
    title: 'Your eSIM is ready! 🎉',
    intro: (plan) => `Thanks for your purchase. Here is your <strong>${plan}</strong>, ready to install.`,
    scanTitle: 'Scan this QR from another device',
    scanDesc: 'Open the camera of the phone where you will install the eSIM and scan the code (you need to view it on another screen or print it).',
    manualTitle: 'Or enter the code manually',
    manualDesc: 'In Settings → Mobile Data → Add eSIM → "Use activation code", paste:',
    iosBtn: 'One-tap install (iPhone)',
    stepsTitle: 'How to install it',
    steps: [
      'Go to Settings → Mobile Data / Connections.',
      'Choose "Add eSIM" and scan the QR (or paste the code).',
      'Enable data roaming for the eSIM when you arrive.',
    ],
    keepTitle: 'Keep this email',
    keepDesc: 'You will need the QR to install the eSIM. If you remove it from your phone, this same code lets you reinstall it.',
    order: 'Order',
    footer: 'Operated by QUIERO LLC · Support: reply to this email and we will help you.',
  },
  PT: {
    subject: (plan) => `Seu ${plan} está pronto — escaneie o QR para instalar`,
    preheader: 'Sua eSIM chegou: instale em um minuto escaneando o código QR.',
    title: 'Sua eSIM está pronta! 🎉',
    intro: (plan) => `Obrigado pela sua compra. Aqui está seu <strong>${plan}</strong>, pronto para instalar.`,
    scanTitle: 'Escaneie este QR de outro dispositivo',
    scanDesc: 'Abra a câmera do telefone onde vai instalar a eSIM e escaneie o código (você precisa vê-lo em outra tela ou imprimi-lo).',
    manualTitle: 'Ou digite o código manualmente',
    manualDesc: 'Em Ajustes → Dados móveis → Adicionar eSIM → "Usar código de ativação", cole:',
    iosBtn: 'Instalação com um toque (iPhone)',
    stepsTitle: 'Como instalar',
    steps: [
      'Vá em Ajustes → Dados móveis / Conexões.',
      'Escolha "Adicionar eSIM" e escaneie o QR (ou cole o código).',
      'Ative o roaming de dados da eSIM ao chegar ao destino.',
    ],
    keepTitle: 'Guarde este email',
    keepDesc: 'Você vai precisar do QR para instalar a eSIM. Se removê-la do telefone, este mesmo código serve para reinstalá-la.',
    order: 'Pedido',
    footer: 'Operado por QUIERO LLC · Suporte: responda este email e te ajudamos.',
  },
};

const VIOLET = '#9933c1';
const DARK = '#18181b';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderQrEmail(data: QrEmailData): { subject: string; html: string } {
  const copy = COPY[data.lang] ?? COPY.ES;
  const plan = escapeHtml(data.planName);
  const lpa = escapeHtml(data.lpa);

  const iosBlock = data.iosTapLink
    ? `<tr><td align="center" style="padding:8px 0 0;">
         <a href="${escapeHtml(data.iosTapLink)}" style="display:inline-block;background:${VIOLET};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:999px;">${copy.iosBtn}</a>
       </td></tr>`
    : '';

  const steps = copy.steps
    .map(
      (step, i) => `<tr><td style="padding:6px 0;font-size:14px;color:#334155;">
        <span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;background:${VIOLET};color:#ffffff;border-radius:999px;font-size:12px;font-weight:bold;margin-right:8px;">${i + 1}</span>${step}
      </td></tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="${data.lang.toLowerCase()}">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${copy.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:${DARK};padding:20px 32px;">
          <span style="font-size:20px;font-weight:bold;color:#ffffff;">Quiero<span style="color:${VIOLET};">SIM</span></span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a;">${copy.title}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#334155;line-height:1.5;">${copy.intro(plan)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td align="center" style="padding:24px 24px 8px;">
              <h2 style="margin:0 0 4px;font-size:15px;color:#0f172a;">${copy.scanTitle}</h2>
              <p style="margin:0 0 16px;font-size:12px;color:#64748b;line-height:1.5;">${copy.scanDesc}</p>
              <img src="cid:${QR_CONTENT_ID}" width="220" height="220" alt="QR eSIM" style="display:block;border:8px solid #ffffff;border-radius:12px;" />
            </td></tr>
            <tr><td align="center" style="padding:8px 24px 24px;">
              <h3 style="margin:16px 0 4px;font-size:13px;color:#0f172a;">${copy.manualTitle}</h3>
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5;">${copy.manualDesc}</p>
              <code style="display:inline-block;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:12px;color:#0f172a;word-break:break-all;">${lpa}</code>
            </td></tr>
            ${iosBlock}
            <tr><td style="padding:0 0 16px;"></td></tr>
          </table>

          <h2 style="margin:28px 0 4px;font-size:15px;color:${VIOLET};">${copy.stepsTitle}</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${steps}</table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#fefce8;border:1px solid #fde68a;border-radius:12px;">
            <tr><td style="padding:14px 18px;">
              <strong style="font-size:13px;color:#854d0e;">${copy.keepTitle}</strong>
              <p style="margin:4px 0 0;font-size:12px;color:#854d0e;line-height:1.5;">${copy.keepDesc}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">${copy.order} <strong style="color:#475569;">#${escapeHtml(data.orderShortId)}</strong> · ${copy.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject: copy.subject(data.planName), html };
}
