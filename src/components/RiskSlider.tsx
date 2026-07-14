import type { CSSProperties } from "react";

type RiskSliderProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function RiskSlider({ value, onChange, min = 0, max = 100, step = 1 }: RiskSliderProps) {
  const progress = ((value - min) / (max - min)) * 100;
  const style = { "--risk-progress": `${progress}%` } as CSSProperties;

  return (
    <div className="space-y-2">
      <input
        aria-label="Rischio Trade"
        className="risk-range"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        style={style}
        type="range"
        value={value}
      />
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
