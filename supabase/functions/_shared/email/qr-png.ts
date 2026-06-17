import { Buffer } from 'node:buffer';
import QRCode from 'qrcode';

/**
 * Genera el QR de activación como PNG en base64 a partir del string LPA.
 * Server-side a propósito: los clientes de mail bloquean data-URIs y JS, así
 * que el QR viaja como adjunto inline (cid) — no dependemos de la imagen de
 * YeSim ni de Storage. `qrcode` es JS puro (pngjs): corre en Deno y en Node.
 */
export async function qrPngBase64(lpa: string): Promise<string> {
  const buffer = await QRCode.toBuffer(lpa, {
    type: 'png',
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
  return Buffer.from(buffer).toString('base64');
}
