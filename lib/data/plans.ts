import { Plan } from '../types';

export const plans: Plan[] = [
  // Estados Unidos
  {
    id: 'us-basic',
    destinationId: 'eeuu',
    dataGB: '5 GB',
    days: 10,
    priceUSD: 15,
    features: ['Red T-Mobile / AT&T', 'Internet 4G/5G LTE', 'Compartir Datos (Hotspot)', 'Activación instantánea']
  },
  {
    id: 'us-popular',
    destinationId: 'eeuu',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 24,
    features: ['Red T-Mobile / AT&T', 'Internet 4G/5G LTE', 'Compartir Datos (Hotspot)', 'Activación instantánea']
  },
  {
    id: 'us-premium',
    destinationId: 'eeuu',
    dataGB: 'Ilimitado',
    days: 30,
    priceUSD: 39,
    features: ['Red T-Mobile / AT&T', 'Internet 5G de Alta Velocidad', 'Compartir hasta 5GB', 'Número local de EE.UU. (opcional)'],
    isPopular: true
  },

  // España
  {
    id: 'es-basic',
    destinationId: 'espana',
    dataGB: '5 GB',
    days: 10,
    priceUSD: 12,
    features: ['Red Movistar / Vodafone', 'Datos a velocidad 4G/5G', 'Mantienes tu WhatsApp', 'Sin contratos ni roaming']
  },
  {
    id: 'es-popular',
    destinationId: 'espana',
    dataGB: '15 GB',
    days: 15,
    priceUSD: 19,
    features: ['Red Movistar / Vodafone', 'Datos a velocidad 4G/5G', 'Mantienes tu WhatsApp', 'Soporte 24/7 en español']
  },
  {
    id: 'es-max',
    destinationId: 'espana',
    dataGB: '30 GB',
    days: 30,
    priceUSD: 29,
    features: ['Red Movistar / Vodafone', 'Datos a velocidad 4G/5G', 'Compartir Datos ilimitado', 'Soporte 24/7 en español'],
    isPopular: true
  },

  // Italia
  {
    id: 'it-basic',
    destinationId: 'italia',
    dataGB: '5 GB',
    days: 10,
    priceUSD: 12,
    features: ['Red TIM / WINDTRE', 'Internet 4G/5G LTE', 'Configuración ultra-rápida (QR)', 'Soporte en español']
  },
  {
    id: 'it-popular',
    destinationId: 'italia',
    dataGB: '15 GB',
    days: 15,
    priceUSD: 19,
    features: ['Red TIM / WINDTRE', 'Internet 4G/5G LTE', 'Configuración ultra-rápida (QR)', 'Contacto directo WhatsApp'],
    isPopular: true
  },

  // Francia
  {
    id: 'fr-basic',
    destinationId: 'francia',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 18,
    features: ['Red Orange / Bouygues', 'Cobertura nacional premium', 'Activación por código QR', 'Mantienes tu SIM física']
  },
  {
    id: 'fr-popular',
    destinationId: 'francia',
    dataGB: '20 GB',
    days: 30,
    priceUSD: 28,
    features: ['Red Orange / Bouygues', 'Cobertura nacional premium', 'Activación por código QR', 'Soporte Multiidioma'],
    isPopular: true
  },

  // Reino Unido
  {
    id: 'gb-popular',
    destinationId: 'reino-unido',
    dataGB: '15 GB',
    days: 15,
    priceUSD: 22,
    features: ['Red EE / Vodafone', 'Internet 4G/5G LTE', 'Código QR directo al mail', 'Permite llamadas VoIP (Skype, WhatsApp)'],
    isPopular: true
  },

  // Japón
  {
    id: 'jp-basic',
    destinationId: 'japon',
    dataGB: '5 GB',
    days: 8,
    priceUSD: 19,
    features: ['Red Softbank / Docomo', 'La mejor velocidad de Japón', 'Configuración e instalación automática', '100% Digital']
  },
  {
    id: 'jp-popular',
    destinationId: 'japon',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 29,
    features: ['Red Softbank / Docomo', 'La mejor velocidad de Japón', 'Configuración e instalación automática', 'Soporte VIP inmediato'],
    isPopular: true
  },

  // México
  {
    id: 'mx-popular',
    destinationId: 'mexico',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 24,
    features: ['Red Telcel / Movistar', 'Internet 4G/5G de alta cobertura', 'Recibes el QR en 2 minutos', 'No requiere contrato'],
    isPopular: true
  },

  // Turquía
  {
    id: 'tr-popular',
    destinationId: 'turquia',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 18,
    features: ['Red Turkcell / Vodafone', 'Excelente cobertura turística', 'Código QR directo por correo', 'Soporte 24/7 en español'],
    isPopular: true
  },

  // Europa Regional
  {
    id: 'eu-basic',
    destinationId: 'europa-multi',
    dataGB: '10 GB',
    days: 15,
    priceUSD: 22,
    features: ['Válido en 32 países europeos', 'Red 4G/5G LTE', 'Compartir datos habilitado', 'Activación instantánea']
  },
  {
    id: 'eu-popular',
    destinationId: 'europa-multi',
    dataGB: '20 GB',
    days: 30,
    priceUSD: 35,
    features: ['Válido en 32 países europeos', 'Súper velocidad 5G LTE', 'Compartir datos habilitado', 'Soporte Premium 24hr']
  },
  {
    id: 'eu-max',
    destinationId: 'europa-multi',
    dataGB: '50 GB',
    days: 30,
    priceUSD: 49,
    features: ['Válido en 32 países europeos', 'Súper velocidad 5G LTE', 'Roaming local incluido gratis', 'Mantienes tus apps normales'],
    isPopular: true
  },

  // América Latina
  {
    id: 'latam-popular',
    destinationId: 'latam-multi',
    dataGB: '10 GB',
    days: 30,
    priceUSD: 45,
    features: ['Válido en 14 países de Latam', 'Internet de alta velocidad', 'Mantienes tus contactos normales', 'Cero cargos sorpresa'],
    isPopular: true
  },

  // Global
  {
    id: 'global-basic',
    destinationId: 'global-multi',
    dataGB: '10 GB',
    days: 30,
    priceUSD: 59,
    features: ['Funciona en 85+ Países', 'Múltiples operadoras por país', 'Ideal para escalas o multidestino', 'Alta estabilidad']
  },
  {
    id: 'global-popular',
    destinationId: 'global-multi',
    dataGB: '20 GB',
    days: 30,
    priceUSD: 89,
    features: ['Funciona en 85+ Países', 'Múltiples operadoras por país', 'Ideal para escalas o multidestino', 'Soporte prioritario VIP'],
    isPopular: true
  }
];

/**
 * Returns static plans for a destination, or generates highly professional fallback plans
 * if the destination clicked does not have custom plans defined.
 */
export function getPlansByDestinationId(destId: string, destName: string): Plan[] {
  const filtered = plans.filter(p => p.destinationId === destId);
  if (filtered.length > 0) {
    return filtered;
  }

  // Generación dinámica pero estable de planes para destinos que no tienen plan explícito hardcodeado
  return [
    {
      id: `${destId}-fallback-1`,
      destinationId: destId,
      dataGB: '5 GB',
      days: 10,
      priceUSD: 16,
      features: [`Red local Premium en ${destName}`, 'Internet 4G/5G LTE de alta velocidad', 'Permite compartir internet', 'Activación inmediata por código QR']
    },
    {
      id: `${destId}-fallback-2`,
      destinationId: destId,
      dataGB: '10 GB',
      days: 20,
      priceUSD: 29,
      features: [`Red local Premium en ${destName}`, 'Internet 4G/5G LTE de alta velocidad', 'Mantienes tu WhatsApp de siempre', 'Soporte en español vía chat 24/7']
    },
    {
      id: `${destId}-fallback-3`,
      destinationId: destId,
      dataGB: 'Ilimitado',
      days: 30,
      priceUSD: 49,
      features: [`Red local Premium en ${destName}`, 'Velocidad 5G garantizada', 'Sin costos adicionales de roaming', 'Garantía de reembolso 100% digital'],
      isPopular: true
    }
  ];
}
