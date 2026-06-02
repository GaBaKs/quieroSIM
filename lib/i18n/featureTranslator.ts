// Simple translator for hardcoded plan features 

import { translations } from './translations';

export function translateFeature(feat: string, lang: 'ES' | 'EN' | 'PT'): string {
  if (lang === 'ES') return feat; // default

  // Special dynamic cases
  if (feat.startsWith('Red local Premium en ')) {
    const destName = feat.replace('Red local Premium en ', '');
    const engDest = translations?.['EN']?.countries?.[destName] || destName;
    const ptDest = translations?.['PT']?.countries?.[destName] || destName;
    
    if (lang === 'EN') return 'Premium Local Network in ' + engDest;
    if (lang === 'PT') return 'Rede Local Premium em ' + ptDest;
  }
  
  if (feat.startsWith('Red ')) {
    if (lang === 'EN') {
       return feat.replace('Red ', '') + ' Network';
    }
    if (lang === 'PT') {
       return feat.replace('Red ', 'Rede ');
    }
  }

  const mapEN: Record<string, string> = {
    'Internet 4G/5G LTE': '4G/5G LTE Internet',
    'Internet 5G de Alta Velocidad': 'High Speed 5G Internet',
    'Compartir Datos (Hotspot)': 'Data Sharing (Hotspot)',
    'Compartir hasta 5GB': 'Share up to 5GB',
    'Activación instantánea': 'Instant Activation',
    'Número local de EE.UU. (opcional)': 'US Local Number (optional)',
    'Datos a velocidad 4G/5G': '4G/5G Speed Data',
    'Mantienes tu WhatsApp': 'Keep your WhatsApp',
    'Sin contratos ni roaming': 'No contracts or roaming',
    'Soporte 24/7 en español': '24/7 Support',
    'Compartir Datos ilimitado': 'Unlimited Data Sharing',
    'Configuración ultra-rápida (QR)': 'Ultra-fast setup (QR)',
    'Soporte en español': 'Customer Support',
    'Contacto directo WhatsApp': 'Direct WhatsApp Contact',
    'Cobertura nacional premium': 'Premium National Coverage',
    'Activación por código QR': 'QR Code Activation',
    'Mantienes tu SIM física': 'Keep your physical SIM',
    'Soporte Multiidioma': 'Multilingual Support',
    'Código QR directo al mail': 'QR code direct to email',
    'Permite llamadas VoIP (Skype, WhatsApp)': 'VoIP Calls allowed (Skype, WA)',
    'La mejor velocidad de Japón': 'Best Speed in Japan',
    'Configuración e instalación automática': 'Automatic setup & installation',
    '100% Digital': '100% Digital',
    'Soporte VIP inmediato': 'Immediate VIP Support',
    'Internet 4G/5G de alta cobertura': 'High-coverage 4G/5G Internet',
    'Recibes el QR en 2 minutos': 'Receive QR in 2 minutes',
    'No requiere contrato': 'No contract required',
    'Excelente cobertura turística': 'Excellent tourist coverage',
    'Código QR directo por correo': 'Direct QR Code by email',
    'Válido en 32 países europeos': 'Valid in 32 European countries',
    'Compartir datos habilitado': 'Data sharing enabled',
    'Súper velocidad 5G LTE': 'Super 5G LTE Speed',
    'Soporte Premium 24hr': 'Premium 24h Support',
    'Roaming local incluido gratis': 'Local roaming included',
    'Mantienes tus apps normales': 'Keep your normal apps',
    'Válido en 14 países de Latam': 'Valid in 14 LATAM countries',
    'Internet de alta velocidad': 'High Speed Internet',
    'Mantienes tus contactos normales': 'Keep your normal contacts',
    'Cero cargos sorpresa': 'Zero surprise charges',
    'Funciona en 85+ Países': 'Works in 85+ Countries',
    'Múltiples operadoras por país': 'Multiple carriers per country',
    'Ideal para escalas o multidestino': 'Ideal for layovers or multi-dest',
    'Alta estabilidad': 'High stability',
    'Soporte prioritario VIP': 'VIP priority support',
    'Internet 4G/5G LTE de alta velocidad': 'High Speed 4G/5G LTE Internet',
    'Permite compartir internet': 'Allows internet sharing',
    'Activación inmediata por código QR': 'Immediate QR code activation',
    'Mantienes tu WhatsApp de siempre': 'Keep your usual WhatsApp',
    'Soporte en español vía chat 24/7': '24/7 chat support',
    'Velocidad 5G garantizada': 'Guaranteed 5G speed',
    'Sin costos adicionales de roaming': 'No extra roaming costs',
    'Garantía de reembolso 100% digital': '100% Digital Refund Guarantee'
  };

  const mapPT: Record<string, string> = {
    'Internet 4G/5G LTE': 'Internet 4G/5G LTE',
    'Internet 5G de Alta Velocidad': 'Internet 5G de Alta Velocidade',
    'Compartir Datos (Hotspot)': 'Compartilhamento (Hotspot)',
    'Compartir hasta 5GB': 'Compartilhar até 5GB',
    'Activación instantánea': 'Ativação instantânea',
    'Número local de EE.UU. (opcional)': 'Número local dos EUA (opcional)',
    'Datos a velocidad 4G/5G': 'Dados na velocidade 4G/5G',
    'Mantienes tu WhatsApp': 'Mantenha seu WhatsApp',
    'Sin contratos ni roaming': 'Sem contratos nem roaming',
    'Soporte 24/7 en español': 'Suporte 24/7',
    'Compartir Datos ilimitado': 'Compartilhamento de Dados Ilimitado',
    'Configuración ultra-rápida (QR)': 'Configuração ultrarrápida (QR)',
    'Soporte en español': 'Suporte ao cliente',
    'Contacto directo WhatsApp': 'Contato direto pelo WhatsApp',
    'Cobertura nacional premium': 'Cobertura nacional premium',
    'Activación por código QR': 'Ativação por código QR',
    'Mantienes tu SIM física': 'Mantenha seu SIM físico',
    'Soporte Multiidioma': 'Suporte Multilíngue',
    'Código QR directo al mail': 'Código QR direto no email',
    'Permite llamadas VoIP (Skype, WhatsApp)': 'Permite chamadas VoIP (Skype, WA)',
    'La mejor velocidad de Japón': 'A melhor velocidade do Japão',
    'Configuración e instalación automática': 'Configuração e instalação automáticas',
    '100% Digital': '100% Digital',
    'Soporte VIP inmediato': 'Suporte VIP imediato',
    'Internet 4G/5G de alta cobertura': 'Internet 4G/5G de alta cobertura',
    'Recibes el QR en 2 minutos': 'Receba o QR em 2 minutos',
    'No requiere contrato': 'Não exige contrato',
    'Excelente cobertura turística': 'Excelente cobertura turística',
    'Código QR directo por correo': 'Código QR direto por email',
    'Válido en 32 países europeos': 'Válido em 32 países europeus',
    'Compartir datos habilitado': 'Compartilhamento de dados ativado',
    'Súper velocidad 5G LTE': 'Super velocidade 5G LTE',
    'Soporte Premium 24hr': 'Suporte Premium 24h',
    'Roaming local incluido gratis': 'Roaming local incluído',
    'Mantienes tus apps normales': 'Mantenha seus apps normais',
    'Válido en 14 países de Latam': 'Válido em 14 países da América Latina',
    'Internet de alta velocidad': 'Internet de alta velocidade',
    'Mantienes tus contactos normales': 'Mantenha seus contatos normais',
    'Cero cargos sorpresa': 'Zero cobranças surpresa',
    'Funciona en 85+ Países': 'Funciona em 85+ Países',
    'Múltiples operadoras por país': 'Múltiplas operadoras por país',
    'Ideal para escalas o multidestino': 'Ideal para escalas ou multidestino',
    'Alta estabilidad': 'Alta estabilidade',
    'Soporte prioritario VIP': 'Suporte prioritário VIP',
    'Internet 4G/5G LTE de alta velocidad': 'Internet 4G/5G LTE de alta velocidade',
    'Permite compartir internet': 'Permite compartilhar internet',
    'Activación inmediata por código QR': 'Ativação imediata por código QR',
    'Mantienes tu WhatsApp de siempre': 'Mantenha seu WhatsApp de sempre',
    'Soporte en español vía chat 24/7': 'Suporte por chat 24/7',
    'Velocidad 5G garantizada': 'Velocidade 5G garantida',
    'Sin costos adicionales de roaming': 'Sem custos extras de roaming',
    'Garantía de reembolso 100% digital': 'Garantia de reembolso 100% digital'
  };

  const map = lang === 'EN' ? mapEN : mapPT;
  return map[feat] || feat;
}
