import { Strain } from './types';

export const getRadarData = (strain: Strain) => [
  { subject: 'Myrcene (Relax)', value: strain.terpenes.myrcene * 100 },
  { subject: 'Limonene (Citrus)', value: strain.terpenes.limonene * 100 },
  { subject: 'Caryophyllene (Spice)', value: strain.terpenes.caryophyllene * 100 },
  { subject: 'Pinene (Focus)', value: strain.terpenes.pinene * 100 },
  { subject: 'Linalool (Floral)', value: strain.terpenes.linalool * 100 }
];
