import { Destination } from '../types';

export const destinations: Destination[] = [
  { id: 'eeuu', name: 'Estados Unidos', code: 'US', region: 'Americas', popular: true, flag: '🇺🇸', searchAliases: ['USA', 'US', 'EUA', 'UNITED STATES', 'EEUU', 'ESTADOS UNIDOS'] },
  { id: 'espana', name: 'España', code: 'ES', region: 'Europe', popular: true, flag: '🇪🇸', searchAliases: ['SPAIN', 'ES', 'ESPANA'] },
  { id: 'italia', name: 'Italia', code: 'IT', region: 'Europe', popular: true, flag: '🇮🇹', searchAliases: ['ITALY', 'IT'] },
  { id: 'francia', name: 'Francia', code: 'FR', region: 'Europe', popular: true, flag: '🇫🇷', searchAliases: ['FRANCE', 'FR'] },
  { id: 'reino-unido', name: 'Reino Unido', code: 'GB', region: 'Europe', popular: true, flag: '🇬🇧', searchAliases: ['UK', 'UNITED KINGDOM', 'ENGLAND', 'INGLATERRA', 'GRAN BRETAÑA', 'GREAT BRITAIN', 'GB', 'LONDRES', 'LONDON'] },
  { id: 'mexico', name: 'México', code: 'MX', region: 'Americas', popular: true, flag: '🇲🇽', searchAliases: ['MEXICO', 'MX'] },
  { id: 'brasil', name: 'Brasil', code: 'BR', region: 'Americas', popular: false, flag: '🇧🇷', searchAliases: ['BRAZIL', 'BR'] },
  { id: 'japon', name: 'Japón', code: 'JP', region: 'Asia', popular: true, flag: '🇯🇵', searchAliases: ['JAPAN', 'JP', 'NIPON'] },
  { id: 'alemania', name: 'Alemania', code: 'DE', region: 'Europe', popular: false, flag: '🇩🇪', searchAliases: ['GERMANY', 'DE', 'DEUTSCHLAND'] },
  { id: 'canada', name: 'Canadá', code: 'CA', region: 'Americas', popular: false, flag: '🇨🇦', searchAliases: ['CANADA', 'CA'] },
  { id: 'colombia', name: 'Colombia', code: 'CO', region: 'Americas', popular: false, flag: '🇨🇴', searchAliases: ['COLOMBIA', 'CO'] },
  { id: 'peru', name: 'Perú', code: 'PE', region: 'Americas', popular: false, flag: '🇵🇪', searchAliases: ['PERU', 'PE'] },
  { id: 'chile', name: 'Chile', code: 'CL', region: 'Americas', popular: false, flag: '🇨🇱', searchAliases: ['CHILE', 'CL'] },
  { id: 'argentina', name: 'Argentina', code: 'AR', region: 'Americas', popular: false, flag: '🇦🇷', searchAliases: ['ARGENTINA', 'AR'] },
  { id: 'suiza', name: 'Suiza', code: 'CH', region: 'Europe', popular: false, flag: '🇨🇭', searchAliases: ['SWITZERLAND', 'CH', 'SUISSE'] },
  { id: 'tailandia', name: 'Tailandia', code: 'TH', region: 'Asia', popular: false, flag: '🇹🇭', searchAliases: ['THAILAND', 'TH'] },
  { id: 'turquia', name: 'Turquía', code: 'TR', region: 'Europe', popular: true, flag: '🇹🇷', searchAliases: ['TURKEY', 'TR', 'TÜRKIYE'] },
  { id: 'egipto', name: 'Egipto', code: 'EG', region: 'Africa', popular: false, flag: '🇪🇬', searchAliases: ['EGYPT', 'EG'] },
  { id: 'sudafrica', name: 'Sudáfrica', code: 'ZA', region: 'Africa', popular: false, flag: '🇿🇦', searchAliases: ['SOUTH AFRICA', 'ZA', 'SUD AFRICA'] },
  { id: 'europa-multi', name: 'Europa Regional', code: 'EU', region: 'Global', popular: true, flag: '🇪🇺', searchAliases: ['EUROPE', 'EU', 'EUROPA', 'UNION EUROPEA'] },
  { id: 'latam-multi', name: 'América Latina', code: 'LATAM', region: 'Global', popular: false, flag: '🌎', searchAliases: ['LATAM', 'AMERICA LATINA', 'LATINOAMERICA', 'SOUTH AMERICA', 'SURAMERICA'] },
  { id: 'global-multi', name: 'Global (85+ Países)', code: 'WORLD', region: 'Global', popular: true, flag: '🌐', searchAliases: ['MUNDIAL', 'TODO EL MUNDO', 'WORLDWIDE', 'GLOBAL', 'PLANETA', 'INTERNACIONAL'] }
];
