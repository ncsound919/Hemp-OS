import { describe, it, expect } from 'vitest';
import {
  convertMass,
  convertVolume,
  convertTemp,
  convertPressure,
  convertTime,
} from '../core/units.ts';

describe('convertMass', () => {
  it('converts kg to g', () => {
    expect(convertMass(5, 'kg', 'g')).toBe(5000);
  });
  it('converts kg to kg (identity)', () => {
    expect(convertMass(10, 'kg', 'kg')).toBe(10);
  });
  it('converts kg to lb', () => {
    const result = convertMass(1, 'kg', 'lb');
    expect(result).toBeCloseTo(2.20462, 4);
  });
  it('converts g to kg', () => {
    expect(convertMass(500, 'g', 'kg')).toBe(0.5);
  });
  it('converts lb to kg', () => {
    const result = convertMass(1, 'lb', 'kg');
    expect(result).toBeCloseTo(0.45359237, 8);
  });
  it('round-trips kg -> lb -> kg', () => {
    const original = 42.5;
    const inLb = convertMass(original, 'kg', 'lb');
    const back = convertMass(inLb, 'lb', 'kg');
    expect(back).toBeCloseTo(original, 8);
  });
});

describe('convertVolume', () => {
  it('converts L to mL', () => {
    expect(convertVolume(2, 'L', 'mL')).toBe(2000);
  });
  it('converts L to L (identity)', () => {
    expect(convertVolume(7.5, 'L', 'L')).toBe(7.5);
  });
  it('converts gal to L', () => {
    const result = convertVolume(1, 'gal', 'L');
    expect(result).toBeCloseTo(3.78541, 4);
  });
  it('converts mL to L', () => {
    expect(convertVolume(250, 'mL', 'L')).toBe(0.25);
  });
  it('converts L to gal', () => {
    const result = convertVolume(3.785411784, 'L', 'gal');
    expect(result).toBeCloseTo(1, 8);
  });
  it('round-trips L -> gal -> L', () => {
    const original = 15.3;
    const inGal = convertVolume(original, 'L', 'gal');
    const back = convertVolume(inGal, 'gal', 'L');
    expect(back).toBeCloseTo(original, 8);
  });
});

describe('convertTemp', () => {
  it('converts C to C (identity)', () => {
    expect(convertTemp(100, 'C', 'C')).toBe(100);
  });
  it('converts C to F', () => {
    const result = convertTemp(100, 'C', 'F');
    expect(result).toBe(212);
  });
  it('converts F to C', () => {
    const result = convertTemp(32, 'F', 'C');
    expect(result).toBe(0);
  });
  it('converts C to K', () => {
    const result = convertTemp(0, 'C', 'K');
    expect(result).toBeCloseTo(273.15, 10);
  });
  it('converts K to C', () => {
    const result = convertTemp(273.15, 'K', 'C');
    expect(result).toBeCloseTo(0, 10);
  });
  it('converts F to K', () => {
    const f = 212; // boiling
    const k = convertTemp(f, 'F', 'K');
    expect(k).toBeCloseTo(373.15, 2);
  });
  it('absolute zero in C', () => {
    const result = convertTemp(0, 'K', 'C');
    expect(result).toBeCloseTo(-273.15, 10);
  });
  it('round-trips C -> F -> C', () => {
    const original = 37.5;
    const inF = convertTemp(original, 'C', 'F');
    const back = convertTemp(inF, 'F', 'C');
    expect(back).toBeCloseTo(original, 8);
  });
  it('works at negative temperatures', () => {
    const result = convertTemp(-40, 'C', 'F');
    expect(result).toBe(-40);
  });
});

describe('convertPressure', () => {
  it('converts mbar to mbar (identity)', () => {
    expect(convertPressure(1, 'mbar', 'mbar')).toBe(1);
  });
  it('converts mbar to torr', () => {
    const result = convertPressure(1, 'mbar', 'torr');
    expect(result).toBeCloseTo(0.75006, 4);
  });
  it('converts torr to mbar', () => {
    const result = convertPressure(1, 'torr', 'mbar');
    expect(result).toBeCloseTo(1.33322, 4);
  });
  it('converts atm to mbar', () => {
    expect(convertPressure(1, 'atm', 'mbar')).toBe(1013.25);
  });
  it('converts psi to mbar', () => {
    expect(convertPressure(1, 'psi', 'mbar')).toBeCloseTo(68.9476, 2);
  });
  it('converts mbar to psi', () => {
    const result = convertPressure(68.94757293, 'mbar', 'psi');
    expect(result).toBeCloseTo(1, 8);
  });
  it('round-trips mbar -> torr -> mbar', () => {
    const original = 760;
    const inTorr = convertPressure(original, 'mbar', 'torr');
    const back = convertPressure(inTorr, 'torr', 'mbar');
    expect(back).toBeCloseTo(original, 6);
  });
});

describe('convertTime', () => {
  it('converts min to min (identity)', () => {
    expect(convertTime(30, 'min', 'min')).toBe(30);
  });
  it('converts min to hr', () => {
    expect(convertTime(120, 'min', 'hr')).toBe(2);
  });
  it('converts hr to min', () => {
    expect(convertTime(1.5, 'hr', 'min')).toBe(90);
  });
  it('converts sec to min', () => {
    expect(convertTime(300, 'sec', 'min')).toBe(5);
  });
  it('converts min to sec', () => {
    expect(convertTime(5, 'min', 'sec')).toBe(300);
  });
  it('converts hr to sec', () => {
    expect(convertTime(1, 'hr', 'sec')).toBe(3600);
  });
  it('round-trips min -> hr -> min', () => {
    const original = 45;
    const inHr = convertTime(original, 'min', 'hr');
    const back = convertTime(inHr, 'hr', 'min');
    expect(back).toBeCloseTo(original, 10);
  });
});

describe('deterministic invariants', () => {
  it('all conversions are pure (same input -> same output)', () => {
    const inputs = [1, 2, 3, 10, 100];
    for (const v of inputs) {
      expect(convertMass(v, 'kg', 'g')).toBe(v * 1000);
      expect(convertVolume(v, 'L', 'mL')).toBe(v * 1000);
      expect(convertTime(v, 'hr', 'min')).toBe(v * 60);
    }
  });

  it('0°C is exactly 32°F and 273.15K', () => {
    expect(convertTemp(0, 'C', 'F')).toBe(32);
    expect(convertTemp(0, 'C', 'K')).toBeCloseTo(273.15, 12);
  });
});
