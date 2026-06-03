'use client';

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { SimulationDataPoint } from '@/lib/simulation';
import { MasterSimulatorConfig, StrategyType, SupportedCurrency, BearMarketScenario } from '@/types/workspace';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';

// ── Strategy-aware bucket config ──────────────────────────────────────────────
type BucketKey = 'bucket1' | 'bucket2' | 'bucket3';

interface BucketDef { key: BucketKey; label: string; color: string }

function getBuckets(strategy: StrategyType): BucketDef[] {
  if (strategy === '1_BUCKET') return [
    { key: 'bucket1', label: 'Portfolio',          color: '#8b5cf6' },
  ];
  if (strategy === '2_BUCKET') return [
    { key: 'bucket1', label: 'Safety (Cash+Debt)', color: '#3b82f6' },
    { key: 'bucket2', label: 'Growth (Equity)',    color: '#8b5cf6' },
  ];
  return [
    { key: 'bucket1', label: 'B1 — Cash',          color: '#22c55e' },
    { key: 'bucket2', label: 'B2 — Debt',          color: '#3b82f6' },
    { key: 'bucket3', label: 'B3 — Equity',        color: '#8b5cf6' },
  ];
}

// ── Chart data ────────────────────────────────────────────────────────────────
interface ChartPoint extends SimulationDataPoint { baseCaseTotal: number }

// ── Tooltip ───────────────────────────────────────────────────────────────────
interface TooltipEntry {
  name: string; value: number; color: string; dataKey: string; payload: ChartPoint;
}
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: number }

function CustomTooltip({ active, payload, label, currency, buckets }: TooltipProps & { currency: SupportedCurrency; buckets: BucketDef[] }) {
  if (!active || !payload?.length) return null;
  const raw      = payload[0]?.payload;
  const crash    = payload.filter(p => p.dataKey !== 'baseCaseTotal');
  const total    = crash.reduce((s, p) => s + (p.value ?? 0), 0);
  const baseLine = payload.find(p => p.dataKey === 'baseCaseTotal');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xl text-xs min-w-[220px]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-slate-700 text-sm">Age {label}</p>
        {raw?.calendarYear && <p className="text-[10px] text-slate-400">CY {raw.calendarYear}</p>}
      </div>

      {raw?.isInCrashWindow && (
        <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-2">
          📉 CRASH YEAR — Equity: {(raw.equityEffectiveRate * 100).toFixed(0)}%
        </p>
      )}

      {[...crash].reverse().map(entry => (
        <div key={entry.dataKey} className="flex justify-between gap-6 py-0.5">
          <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
            {buckets.find(b => b.key === entry.dataKey)?.label ?? entry.name}
          </span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {formatCurrencyShort(entry.value, currency)}
          </span>
        </div>
      ))}

      <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between gap-6 font-bold text-slate-800">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total, currency)}</span>
      </div>

      {baseLine && (
        <div className="flex justify-between gap-6 text-slate-500 mt-0.5 text-[10px]">
          <span>Base case</span>
          <span className="tabular-nums font-semibold">{formatCurrency(baseLine.value, currency)}</span>
        </div>
      )}

      {raw && raw.annualExpense > 0 && (
        <div className="border-t border-slate-100 mt-2 pt-2 space-y-0.5 text-[10px] text-slate-500">
          {raw.annualExpense > 0 && (
            <div className="flex justify-between">
              <span>Living expenses</span>
              <span className="text-red-500">−{formatCurrencyShort(raw.annualExpense, currency)}</span>
            </div>
          )}
          {raw.annualOutflow > 0 && (
            <div className="flex justify-between">
              <span>Milestone outflow</span>
              <span className="text-red-400">−{formatCurrencyShort(raw.annualOutflow, currency)}</span>
            </div>
          )}
          {raw.annualInflow > 0 && (
            <div className="flex justify-between">
              <span>Milestone inflow</span>
              <span className="text-green-500">+{formatCurrencyShort(raw.annualInflow, currency)}</span>
            </div>
          )}
          {raw.refillB1FromB2 > 0 && (
            <div className="flex justify-between">
              <span>Safety → B1 refill</span>
              <span className="text-blue-400">{formatCurrencyShort(raw.refillB1FromB2, currency)}</span>
            </div>
          )}
          {raw.refillB2FromB3 > 0 && (
            <div className="flex justify-between">
              <span>Equity → B2 refill</span>
              <span className="text-violet-400">{formatCurrencyShort(raw.refillB2FromB3, currency)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface PortfolioChartProps {
  config: MasterSimulatorConfig;
  baseDataPoints: SimulationDataPoint[];
  crashDataPoints: SimulationDataPoint[];
}

export default function PortfolioChart({ config, baseDataPoints, crashDataPoints }: PortfolioChartProps) {
  const {
    themePrimaryColor, bearCaseEnabled, bearMarketScenarios,
    retirementAge, lifeExpectancy, strategy, baseCurrency,
  } = config;

  const buckets   = getBuckets(strategy);
  const currency  = baseCurrency as SupportedCurrency;
  const fmtShort  = (v: number) => formatCurrencyShort(v, currency);
  const showBase  = bearCaseEnabled;

  const activeBears: BearMarketScenario[] = bearCaseEnabled
    ? (bearMarketScenarios ?? []).filter(s => s.enabled)
    : [];

  const chartData: ChartPoint[] = crashDataPoints.map((bp, i) => ({
    ...bp,
    baseCaseTotal: baseDataPoints[i]?.total ?? 0,
  }));

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-5 shadow-sm">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        {/* Title + stress badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-slate-800 text-sm">Portfolio trajectory</h3>
          {bearCaseEnabled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#FAECE7] text-[#993C1D]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#D85A30]" />
              Stress test active
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {buckets.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </div>
          ))}
          {showBase && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <svg width="18" height="8">
                <line x1="0" y1="4" x2="18" y2="4" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
              </svg>
              Base case
            </div>
          )}
        </div>
      </div>

      {/* ── Event pills row ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Retirement marker pill */}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-1 border"
          style={{
            borderColor: '#B5D4F4',
            color: '#185FA5',
            backgroundColor: '#E6F1FB',
          }}
        >
          ▶ Retire ({retirementAge})
        </span>

        {/* Per-scenario crash pills */}
        {activeBears.map(s => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-1 border border-[#F5C4B3] bg-[#FAECE7] text-[#993C1D]"
          >
            ⚠ {s.label} −{(s.drawdownPct * 100).toFixed(0)}% (age {s.crashAge})
          </span>
        ))}
      </div>

      {/* ── Chart ────────────────────────────────────────────────────── */}
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 10, bottom: 16 }}>
          <defs>
            {buckets.map(({ key, color }) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={color} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: 'Client Age', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={78}
          />

          <Tooltip content={<CustomTooltip currency={currency} buckets={buckets} />} />

          {/* Retirement reference line */}
          <ReferenceLine
            x={retirementAge}
            stroke={themePrimaryColor}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />

          {/* Per-scenario crash reference lines (thin, no label text) */}
          {activeBears.map(s => (
            <ReferenceLine
              key={s.id}
              x={s.crashAge}
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeOpacity={0.7}
            />
          ))}

          {/* Stacked bucket areas */}
          {buckets.map(({ key, label, color }) => (
            <Area
              key={key} type="monotone" dataKey={key} stackId="buckets"
              stroke={color} strokeWidth={2} fill={`url(#grad-${key})`} name={label}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}

          {/* Base case dashed overlay */}
          {showBase && (
            <Line
              type="monotone" dataKey="baseCaseTotal"
              stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 4"
              dot={false} name="Base Case"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
