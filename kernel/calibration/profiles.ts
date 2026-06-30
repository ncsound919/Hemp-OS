/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Biomass, CannabinoidProfile } from '../core/types.ts';

export interface CalibrationProfile {
  id: string;
  name: string;
  description: string;
  biomassTemplate: Omit<Biomass, 'id' | 'mass'>;
}

export const BIOMASS_PROFILES: Record<string, CalibrationProfile> = {
  high_cbd_hemp: {
    id: 'cbd_cherry_wine',
    name: 'Cherry Wine (High CBD Hemp)',
    description: 'Premium CBD-dominant flower with high terpene retention and moderate wax content.',
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
