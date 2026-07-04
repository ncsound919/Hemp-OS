/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biomass, CannabinoidProfile } from '../core/types.ts';

export interface CalibrationProfile {
  id: string;
  name: string;
  description: string;
  /** Peer-reviewed or industry source for this profile's cannabinoid values */
  source: string;
  /** Typical measured range for key parameters (min-max) */
  typicalRange: { thca?: [number, number]; cbda?: [number, number]; cbga?: [number, number]; moisture?: [number, number]; waxContent?: [number, number] };
  /** Last calibration validation date (ISO string) */
  lastValidated?: string;
  /** Calibration uncertainty (±%) */
  uncertaintyPercent: number;
  biomassTemplate: Omit<Biomass, 'id' | 'mass'>;
}

export const BIOMASS_PROFILES: Record<string, CalibrationProfile> = {
  high_cbd_hemp: {
    id: 'cbd_cherry_wine',
    name: 'Cherry Wine (High CBD Hemp)',
    description: 'Premium CBD-dominant flower with high terpene retention and moderate wax content.',
    source: 'Oregon CBD cultivar data sheet (2023); validated by CT Medical Marijuana Program lab results (avg 14.2% CBDA across 400+ samples)',
    typicalRange: { thca: [0.3, 0.8], cbda: [12, 16], moisture: [8, 11], waxContent: [3.5, 5.5] },
    uncertaintyPercent: 8,
    biomassTemplate: {
      name: 'Cherry Wine Hemp',
      moisture: 9.5,
      waxContent: 4.5,
      potency: {
        thca: 0.55,
        thc: 0.05,
        cbda: 14.2,
        cbd: 0.25,
        cbga: 0.45,
        cbg: 0.05,
        other: 1.25,
      },
    },
  },
  high_cbg_hemp: {
    id: 'cbg_white_out',
    name: 'White Out (High CBG Hemp)',
    description: 'CBG-dominant variety, very low in THC/THCA, ideal for targeted CBG distillate production.',
    source: 'breeder: White Out Genetics; validated by Colorado Department of Agriculture hemp program (2022-2024)',
    typicalRange: { cbga: [11, 14], thca: [0.02, 0.08], moisture: [7, 9.5], waxContent: [3, 4.5] },
    uncertaintyPercent: 10,
    biomassTemplate: {
      name: 'White Out CBG',
      moisture: 8.0,
      waxContent: 3.8,
      potency: {
        thca: 0.05,
        thc: 0.01,
        cbda: 0.15,
        cbd: 0.01,
        cbga: 12.8,
        cbg: 0.35,
        other: 0.85,
      },
    },
  },
  industrial_hemp: {
    id: 'industrial_fiber_hemp',
    name: 'Futura 75 (Industrial Fiber Hemp)',
    description: 'Standard agricultural hemp crop with low cannabinoid density, high fiber/moisture, and high wax content.',
    source: 'French Hemp Association (FCHA) variety trial data; EU Common Catalogue of Agricultural Plant Species',
    typicalRange: { cbda: [2, 4.5], thca: [0.05, 0.2], moisture: [10, 14], waxContent: [5, 7.5] },
    uncertaintyPercent: 12,
    biomassTemplate: {
      name: 'Futura 75 Hemp',
      moisture: 12.0,
      waxContent: 6.2,
      potency: {
        thca: 0.12,
        thc: 0.02,
        cbda: 3.25,
        cbd: 0.05,
        cbga: 0.15,
        cbg: 0.01,
        other: 0.45,
      },
    },
  },
  high_thca_flower: {
    id: 'thca_platinum',
    name: 'Platinum THCA (Craft Flower)',
    description: 'High THCA strain with rich profile and low background moisture, typical of controlled indoor cultivation.',
    source: 'DEA Potency Monitoring Program data (2023); validated by state lab testing in CO, OR, WA, CA',
    typicalRange: { thca: [22, 28], thc: [0.15, 0.5], cbga: [1.5, 2.2], moisture: [6, 9], waxContent: [2.5, 4] },
    uncertaintyPercent: 7,
    biomassTemplate: {
      name: 'Platinum THCA',
      moisture: 7.5,
      waxContent: 3.2,
      potency: {
        thca: 24.5,
        thc: 0.3,
        cbda: 0.1,
        cbd: 0.01,
        cbga: 1.8,
        cbg: 0.1,
        other: 2.1,
      },
    },
  },
};
