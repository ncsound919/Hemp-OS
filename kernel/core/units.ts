/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// HempForge Kernel: Units and Conversion Library (Strictly Deterministic)

export type MassUnit = 'kg' | 'g' | 'lb';
export type VolumeUnit = 'L' | 'mL' | 'gal';
export type TempUnit = 'C' | 'F' | 'K';
export type PressureUnit = 'mbar' | 'torr' | 'psi' | 'atm';
export type TimeUnit = 'min' | 'hr' | 'sec';

// Mass Conversions (to kg)
export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  let inKg = value;
  switch (from) {
    case 'g':
      inKg = value / 1000;
      break;
    case 'lb':
      inKg = value * 0.45359237;
      break;
    case 'kg':
      inKg = value;
      break;
  }

  switch (to) {
    case 'g':
      return inKg * 1000;
    case 'lb':
      return inKg / 0.45359237;
    case 'kg':
      return inKg;
  }
}

// Volume Conversions (to L)
export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  let inL = value;
  switch (from) {
    case 'mL':
      inL = value / 1000;
      break;
    case 'gal':
      inL = value * 3.785411784;
      break;
    case 'L':
      inL = value;
      break;
  }

  switch (to) {
    case 'mL':
      return inL * 1000;
    case 'gal':
      return inL / 3.785411784;
    case 'L':
      return inL;
  }
}

// Temperature Conversions (to C)
export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  let inC = value;
  switch (from) {
    case 'F':
      inC = (value - 32) * (5 / 9);
      break;
    case 'K':
      inC = value - 273.15;
      break;
    case 'C':
      inC = value;
      break;
  }

  switch (to) {
    case 'F':
      return inC * (9 / 5) + 32;
    case 'K':
      return inC + 273.15;
    case 'C':
      return inC;
  }
}

// Pressure Conversions (to mbar)
export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  let inMbar = value;
  switch (from) {
    case 'torr':
      inMbar = value * 1.333223684;
      break;
    case 'psi':
      inMbar = value * 68.94757293;
      break;
    case 'atm':
      inMbar = value * 1013.25;
      break;
    case 'mbar':
      inMbar = value;
      break;
  }

  switch (to) {
    case 'torr':
      return inMbar / 1.333223684;
    case 'psi':
      return inMbar / 68.94757293;
    case 'atm':
      return inMbar / 1013.25;
    case 'mbar':
      return inMbar;
  }
}

// Time Conversions (to minutes)
export function convertTime(value: number, from: TimeUnit, to: TimeUnit): number {
  let inMin = value;
  switch (from) {
    case 'sec':
      inMin = value / 60;
      break;
    case 'hr':
      inMin = value * 60;
      break;
    case 'min':
      inMin = value;
      break;
  }

  switch (to) {
    case 'sec':
      return inMin * 60;
    case 'hr':
      return inMin / 60;
    case 'min':
      return inMin;
  }
}
