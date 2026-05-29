export interface Destination {
  id: string;
  name: string;
  code: string; // ISO Code (e.g., 'US', 'ES', 'FR')
  region: 'Americas' | 'Europe' | 'Asia' | 'Africa' | 'Global';
  popular: boolean;
  flag: string; // Emoji flags or SVG urls
  searchAliases?: string[]; // Alternative names for search (e.g. USA, UK, etc.)
}

export interface Plan {
  id: string;
  destinationId: string;
  dataGB: string; // "5 GB", "10 GB", "Ilimitado"
  days: number;   // Validez en días
  priceUSD: number;
  isPopular?: boolean;
  features: string[]; // ['Internet 5G/LTE', 'Compartir datos', 'Activación inmediata']
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string; // URL o iniciales
  rating: number; // 1-5
  text: string;
  destination: string; // País visitado
  originCountry: string; // País de origen
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface CompatibilityDevice {
  brand: string;
  models: string[];
}
