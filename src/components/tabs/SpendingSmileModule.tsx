'use client';

import {
  MasterSimulatorConfig,
  SpendingSmileConfig,
  SupportedCurrency,
} from '@/types/workspace';
import { computeSmileExpenseAtT, smilePeaks } from '@/lib/simulation';
import { formatCurrencyShort } from '@/lib/formatters';
import {
  ComposedChart,
  Bar,
  Line,
  Cell,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

// ── Design tokens ─────────────────────────────────────────────────────────────
const PHASE = {
  1: { color: '#7F77DD', label: 'Go-Go',   bg: '#EEEDFE', text: '#3C3489' },
  2: { color: '#378ADD', label: 'Slow-Go', bg: '#E6F1FB', text: '#185FA5' },
  3: { color: '#D85A30', label: 'No-Go',   bg: '#FAECE7', text: '#993C1D' },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
}

// ── Chart data builder ────────────────────────────────────────────────────────
interface ChartPoint {
  t: number;
  age: number;
  smileExpense: number;
  cpiExpense: number;
  phase: 1 | 2 | 3;
}

function buildChartData(config: MasterSimulatorConfig): ChartPoint[] {
  const {
    retirementAge, lifeExpectancy, currentAge,
    monthlyExpensesNative, inflationRate, spendingSmile,
  } = config;
  const totalYears = Math.max(0, lifeExpectancy - retirementAge);
  if (totalYears === 0) return [];

  // Nominal annual expense at the moment of retirement
  const L = monthlyExpensesNative * 12 * Math.pow(1 + inflationRate, retirementAge - currentAge);
  const { phase1Duration, phase2Duration, phase1Premium, phase2Contraction, phase3Escalator } = spendingSmile;

  return Array.from({ length: totalYears }, (_, i): ChartPoint => {
    const t    = i;
    const age  = retirementAge + t;
    const phase: 1 | 2 | 3 =
      t < phase1Duration                        ? 1 :
      t < phase1Duration + phase2Duration ? 2 : 3;

    // CPI-only baseline (no smile): same growth as FULL_CPI from retirement base
    const cpiExpense = L * Math.pow(1 + inflationRate, t + 1);

    // Smile expense
    const smileExpense = computeSmileExpenseAtT(
      t, L, inflationRate, phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration,
    );

    return { t, age, smileExpense, cpiExpense, phase };
  });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function SmileTooltip({
  active, payload, baseCurrency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  baseCurrency: SupportedCurrency;
}) {
  if (!active || !payload?.length) return null;
  const smile = payload.find(p => p.name === 'smileExpense');
  const cpi   = payload.find(p => p.name === 'cpiExpense');
  const fmt   = (v: number) => formatCurrencyShort(v, baseCurrency);
  return (
    <div className="bg-white border border-black/[0.08] rounded-lg px-2.5 py-2 shadow-md text-[10px]">
      {smile && <p className="font-semibold text-slate-700">Smile: {fmt(smile.value)}</p>}
      {cpi   && <p className="text-slate-400">CPI only: {fmt(cpi.value)}</p>}
    </div>
  );
}

// ── No-spinner number input ───────────────────────────────────────────────────
function SmileInput({
  label, value, step, min, max, suffix,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  const display = suffix === '%' ? +(value * 100).toFixed(2) : value;
  return (
    <div>
      <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={display}
          onChange={e => {
            const raw = parseFloat(e.target.value);
            if (!isFinite(raw)) return;
            onChange(suffix === '%' ? raw / 100 : raw);
          }}
          className={[
            'flex-1 min-w-0 h-7 px-2 text-[12px] font-mono font-semibold text-slate-800',
            'bg-white border border-black/[0.08] rounded-md outline-none',
            'focus:border-slate-400 tabular-nums',
            // suppress native spinners
            '[appearance:textfield]',
            '[&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none',
            '[&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none',
          ].join(' ')}
        />
        <span className="text-[10px] text-slate-400 shrink-0">{suffix}</span>
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0 text-center">
      <p className="text-[9px] text-slate-400 truncate">{label}</p>
      <p className="text-[12px] font-semibold text-slate-800 tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}

// ── Main module ───────────────────────────────────────────────────────────────
export default function SpendingSmileModule({ config, onUpdate }: Props) {
  const {
    spendingSmile, retirementAge, lifeExpectancy, currentAge,
    monthlyExpensesNative, inflationRate, baseCurrency,
  } = config;
  const {
    isEnabled, phase1Premium, phase2Contraction, phase3Escalator,
    phase1Duration, phase2Duration,
  } = spendingSmile;

  const totalRetirementYears = Math.max(0, lifeExpectancy - retirementAge);
  const phase3Duration = Math.max(0, totalRetirementYears - phase1Duration - phase2Duration);
  const isPhaseOverlap = phase1Duration + phase2Duration >= totalRetirementYears;

  // Retirement-day annual base (for stats)
  const L = monthlyExpensesNative * 12 * Math.pow(1 + inflationRate, retirementAge - currentAge);
  const { p1Peak, r2, p2End } = smilePeaks(L, inflationRate, phase1Premium, phase2Contraction, phase1Duration, phase2Duration);

  const year1Expense  = computeSmileExpenseAtT(0, L, inflationRate, phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration);
  const p1PeakExpense = p1Peak;
  const p2TroughExpense = p2End; // end of phase 2 is the trough of the real curve
  const finalT = totalRetirementYears - 1;
  const finalExpense = finalT >= 0
    ? computeSmileExpenseAtT(finalT, L, inflationRate, phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration)
    : 0;

  const chartData = buildChartData(config);
  const fmt = (v: number) => formatCurrencyShort(v, baseCurrency as SupportedCurrency);

  const update = (patch: Partial<SpendingSmileConfig>) =>
    onUpdate({ spendingSmile: { ...spendingSmile, ...patch } });

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
        <div>
          <p className="text-[12px] font-semibold text-slate-800">Spending Smile</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            3-phase parametric — Go-Go · Slow-Go · No-Go
          </p>
        </div>

        {/* Toggle pill */}
        <button
          type="button"
          onClick={() => update({ isEnabled: !isEnabled })}
          className={[
            'flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-3 py-1 transition-all',
            isEnabled
              ? 'bg-[#EEEDFE] text-[#3C3489] border border-[#C4C0F0]'
              : 'bg-[#f6f7f9] text-[#9ca3af] border border-black/[0.08]',
          ].join(' ')}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${isEnabled ? 'bg-[#7F77DD]' : 'bg-[#d1d5db]'}`}
          />
          {isEnabled ? 'Active' : 'Off'}
        </button>
      </div>

      {/* ── Body (fades when off) ─────────────────────────────────────── */}
      <div
        className="transition-opacity duration-200"
        style={{ opacity: isEnabled ? 1 : 0.38, pointerEvents: isEnabled ? 'auto' : 'none' }}
      >

        {/* ── Phase parameter cards ──────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-0 divide-x divide-black/[0.06]">

          {/* Phase 1 — Go-Go */}
          <div className="px-3 py-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: PHASE[1].bg, color: PHASE[1].text }}
              >
                {PHASE[1].label}
              </span>
            </div>
            <SmileInput
              label="Duration"
              value={phase1Duration}
              step={1} min={1} max={totalRetirementYears - 1}
              suffix="yr"
              onChange={v => update({ phase1Duration: Math.round(v) })}
            />
            <SmileInput
              label="Premium above CPI"
              value={phase1Premium}
              step={0.1} min={0} max={10}
              suffix="%"
              onChange={v => update({ phase1Premium: v })}
            />
            <div className="text-[9px] text-slate-400 leading-relaxed">
              Growth: <span className="font-semibold" style={{ color: PHASE[1].color }}>
                {((inflationRate + phase1Premium) * 100).toFixed(1)}%
              </span> /yr
            </div>
          </div>

          {/* Phase 2 — Slow-Go */}
          <div className="px-3 py-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: PHASE[2].bg, color: PHASE[2].text }}
              >
                {PHASE[2].label}
              </span>
            </div>
            <SmileInput
              label="Duration"
              value={phase2Duration}
              step={1} min={1} max={totalRetirementYears - phase1Duration}
              suffix="yr"
              onChange={v => update({ phase2Duration: Math.round(v) })}
            />
            <SmileInput
              label="CPI drag"
              value={phase2Contraction}
              step={0.1} min={0} max={10}
              suffix="%"
              onChange={v => update({ phase2Contraction: v })}
            />
            <div className="text-[9px] text-slate-400 leading-relaxed">
              Growth: <span className="font-semibold" style={{ color: PHASE[2].color }}>
                {(Math.max(inflationRate - phase2Contraction, 0.001) * 100).toFixed(1)}%
              </span> /yr
            </div>
          </div>

          {/* Phase 3 — No-Go */}
          <div className="px-3 py-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5"
                style={{ backgroundColor: PHASE[3].bg, color: PHASE[3].text }}
              >
                {PHASE[3].label}
              </span>
              <span className="text-[8px] text-slate-400">{phase3Duration} yr</span>
            </div>
            <div className="h-[44px]" /> {/* spacer to align with duration/contraction rows */}
            <SmileInput
              label="Healthcare escalator"
              value={phase3Escalator}
              step={0.1} min={0} max={10}
              suffix="%"
              onChange={v => update({ phase3Escalator: v })}
            />
            <div className="text-[9px] text-slate-400 leading-relaxed">
              Growth: <span className="font-semibold" style={{ color: PHASE[3].color }}>
                {((inflationRate + phase3Escalator) * 100).toFixed(1)}%
              </span> /yr
            </div>
          </div>

        </div>

        {/* ── Chart ─────────────────────────────────────────────────── */}
        {chartData.length > 0 && (
          <div className="px-3 pb-1 border-t border-black/[0.06]">
            <ResponsiveContainer width="100%" height={130}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <XAxis
                  dataKey="age"
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Tooltip
                  content={({ active, payload }) => (
                    <SmileTooltip
                      active={active}
                      payload={(payload as unknown) as Array<{ name: string; value: number }>}
                      baseCurrency={baseCurrency as SupportedCurrency}
                    />
                  )}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="smileExpense" maxBarSize={14} radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={PHASE[entry.phase].color} fillOpacity={0.85} />
                  ))}
                </Bar>
                <Line
                  dataKey="cpiExpense"
                  type="monotone"
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center gap-3 justify-center pb-2 -mt-1">
              {([1, 2, 3] as const).map(p => (
                <div key={p} className="flex items-center gap-1 text-[8px] text-slate-500">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: PHASE[p].color }} />
                  {PHASE[p].label}
                </div>
              ))}
              <div className="flex items-center gap-1 text-[8px] text-slate-400">
                <span className="inline-block w-4 border-t-2 border-dashed border-[#9ca3af]" />
                CPI only
              </div>
            </div>
          </div>
        )}

        {/* ── 4-stat strip ──────────────────────────────────────────── */}
        <div className="flex items-center divide-x divide-black/[0.06] border-t border-black/[0.06] py-2.5">
          <StatChip label="Year 1 outflow"  value={fmt(year1Expense)} />
          <StatChip label="P1 peak"         value={fmt(p1PeakExpense)} />
          <StatChip label="P2 trough"       value={fmt(p2TroughExpense)} />
          <StatChip label="Final year"      value={fmt(finalExpense)} />
        </div>

        {/* ── Warning banner ────────────────────────────────────────── */}
        {isPhaseOverlap && (
          <div className="mx-3 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Phase 1 + Phase 2 ({phase1Duration + phase2Duration} yr) fills the entire retirement horizon
              ({totalRetirementYears} yr). No-Go phase has 0 years — consider reducing durations.
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
