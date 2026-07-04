
import React from 'react';

interface RangeFieldProps {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  accentColor: string;
}

export const RangeField: React.FC<RangeFieldProps> = ({ label, value, min, max, step, onChange, accentColor }) => {
  const labelStyle = "block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center justify-between";
  return (
    <div>
      <label className={labelStyle}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer ${accentColor}`}
      />
    </div>
  );
};

interface SelectFieldProps {
  label: React.ReactNode;
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (val: string | number) => void;
  accentColorRing: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChange, accentColorRing }) => {
  const labelStyle = "block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-1.5 flex items-center justify-between";
  return (
    <div>
      <label className={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-1.5 bg-[#1a1a1c] border border-[#2d2d30] rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 ${accentColorRing} cursor-pointer`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#121214]">{opt.label}</option>
        ))}
      </select>
    </div>
  );
};
