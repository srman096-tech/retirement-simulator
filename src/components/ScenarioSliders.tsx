'use client';

import { Slider } from '@/components/ui/slider';
import { MasterSimulatorConfig } from '@/types/workspace';

interface ScenarioSlidersProps {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  themePrimaryColor: string;
}

interface SliderCardProps {
  label: string;
  sublabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueColor: string;
  onChange: (v: number) => void;
}

function SliderCard({
  label, sublabel, value, min, max, step, valueColor, onChange,
}: SliderCardProps) {
  const handle = (v: number | readonly number[]) => {
    const num = Array.isArray(v) ? (v as readonly number[])[0] : (v as number);
    onChange(num);
  };

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[12px] font-semibold text-[#111827] leading-tight">{label}</p>
          <p className="text-[10px] text-[#9ca3af] mt-0.5">{sublabel}</p>
        </div>
        <span
          className="text-[20px] font-semibold tabular-nums leading-none mt-0.5"
          style={{ color: valueColor }}
        >
          {value.toFixed(1)}%
        </span>
      </div>

      <Slider
        value={[value]}
        min={min} max={max} step={step}
        onValueChange={handle}
        className="w-full"
      />

      <div className="flex justify-between mt-1 text-[9px] text-[#9ca3af]">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}

export default function ScenarioSliders({ config, onUpdate, themePrimaryColor }: ScenarioSlidersProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[12px] font-semibold text-[#6b7280]">What-if scenario stress testing</h3>
        <span className="text-[10px] text-[#9ca3af]">· drag to instantly recalculate</span>
      </div>

      {/* 3-column slider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SliderCard
          label="Inflation rate"
          sublabel="Annual cost-of-living increase"
          value={+(config.inflationRate * 100).toFixed(1)}
          min={1} max={12} step={0.5}
          valueColor="#ef4444"
          onChange={v => onUpdate({ inflationRate: v / 100 })}
        />
        <SliderCard
          label="Equity return rate"
          sublabel="Growth / equity bucket annual return"
          value={+(config.equityReturnRate * 100).toFixed(1)}
          min={3} max={18} step={0.5}
          valueColor={themePrimaryColor}
          onChange={v => onUpdate({ equityReturnRate: v / 100 })}
        />
        <SliderCard
          label="Debt return rate"
          sublabel="Conservative / debt bucket annual"
          value={+(config.debtReturnRate * 100).toFixed(1)}
          min={1} max={12} step={0.5}
          valueColor="#2563eb"
          onChange={v => onUpdate({ debtReturnRate: v / 100 })}
        />
      </div>
    </div>
  );
}
