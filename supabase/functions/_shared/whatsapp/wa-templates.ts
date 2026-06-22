import type { EmailLang } from '../email/templates.ts';

/**
 * Texto del mensaje de WhatsApp post-compra (ES/EN/PT). La imagen del QR va
 * aparte como media (MediaUrl); acá solo el cuerpo. El email sigue siendo el
 * canal con el paso a paso completo — WhatsApp es el aviso + QR a mano.
 *
 * Reutiliza EmailLang para no divergir del idioma resuelto en la orden.
 */

export interface QrWhatsappData {
  lang: EmailLang;
  /** Nombre comercial del plan, ej. "eSIM Estados Unidos 5GB". */
  planName: string;
  /** Id corto de la orden para referencia del cliente. */
  orderShortId: string;
}

const COPY: Record<EmailLang, (plan: string, order: string) => string> = {
  ES: (plan, order) =>
    `¡Tu eSIM ya está lista! 🎉\n\n` +
    `Escaneá el QR de abajo para instalar tu *${plan}*.\n\n` +
    `📲 Desde otro dispositivo: abrí la cámara y escaneá la imagen.\n` +
    `También te la enviamos por email con el paso a paso.\n\n` +
    `Orden #${order} · QuieroSIM`,
  EN: (plan, order) =>
    `Your eSIM is ready! 🎉\n\n` +
    `Scan the QR below to install your *${plan}*.\n\n` +
    `📲 From another device: open the camera and scan the image.\n` +
    `We also emailed it to you with step-by-step instructions.\n\n` +
    `Order #${order} · QuieroSIM`,
  PT: (plan, order) =>
    `Sua eSIM está pronta! 🎉\n\n` +
    `Escaneie o QR abaixo para instalar seu *${plan}*.\n\n` +
    `📲 De outro dispositivo: abra a câmera e escaneie a imagem.\n` +
    `Também enviamos para seu email com o passo a passo.\n\n` +
    `Pedido #${order} · QuieroSIM`,
};

export function renderQrWhatsapp(data: QrWhatsappData): { body: string } {
  const fn = COPY[data.lang] ?? COPY.ES;
  return { body: fn(data.planName, data.orderShortId) };
}
