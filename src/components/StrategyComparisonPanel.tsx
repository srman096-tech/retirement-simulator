'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SimulationResult } from '@/lib/simulation';
import { MasterSimulatorConfig, SupportedCurrency } from '@/types/workspace';
import { formatCurrencyShort } from '@/lib/formatters';

// ── Design tokens ─────────────────────────────────────────────────────────────
const STRATEGY_META = {
  '1_BUCKET': {
    label: '1-Bucket',
    sub:   'Unified pool — blended return, single drawdown',
    color: '#2563EB',
    dot:   'bg-blue-500',
  },
  '2_BUCKET': {
    label: '2-Bucket',
    sub:   'Safety (Cash+Debt) + Growth (Equity)',
    color: '#7C3AED',
    dot:   'bg-violet-500',
  },
  '3_BUCKET': {
    label: '3-Bucket',
    sub:   'Cash → Debt → Equity — staged drawdown',
    color: '#059669',
    dot:   'bg-emerald-500',
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtS(v: number, cur: SupportedCurrency) {
  return formatCurrencyShort(v, cur);
}

function FundedBadge({ funded }: { funded: boolean }) {
  return funded ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Funded
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Shortfall
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  config: MasterSimulatorConfig;
  result1B: SimulationResult;
  result2B: SimulationResult;
  result3B: SimulationResult;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StrategyComparisonPanel({ config, result1B, result2B, result3B }: Props) {
  const { baseCurrency, retirementAge, lifeExpectancy, currentAge, strategy: activeStrategy } = config;
  const currency = baseCurrency as SupportedCurrency;

  const results = [
    { key: '1_BUCKET' as const, result: result1B },
    { key: '2_BUCKET' as const, result: result2B },
    { key: '3_BUCKET' as const, result: result3B },
  ];

  // ── KPI rows ────────────────────────────────────────────────────────────────
  const kpiRows = [
    {
      label: 'Funded Status',
      render: (r: SimulationResult) => <FundedBadge funded={r.isFunded} />,
    },
    {
      label: `Portfolio at Retirement (${retirementAge})`,
      render: (r: SimulationResult) => {
        const dp = r.dataPoints.find(d => d.age === retirementAge);
        return dp ? fmtS(dp.total, currency) : '—';
      },
    },
    {
      label: `Terminal Estate — age ${lifeExpectancy} (nominal)`,
      render: (r: SimulationResult) => fmtS(r.finalEstateValue, currency),
    },
    {
      label: `Terminal Estate — age ${lifeExpectancy} (real)`,
      render: (r: SimulationResult) => fmtS(r.finalEstateValueReal, currency),
    },
    {
      label: 'Capital Horizon',
      render: (r: SimulationResult) =>
        r.isFunded
          ? <span className="text-emerald-600 font-semibold">Age {lifeExpectancy}+</span>
          : <span className="text-red-600 font-semibold">Age {r.exhaustionAge ?? '?'}</span>,
    },
  ];

  // ── Chart data — merge all three trajectories by age ───────────────────────
  const allAges = result3B.dataPoints.map(d => d.age);
  const chartData = allAges.map(age => {
    const find = (r: SimulationResult) => r.dataPoints.find(d => d.age === age)?.total ?? 0;
    return {
      age,
      b1: find(result1B),
      b2: find(result2B),
      b3: find(result3B),
    };
  });

  const maxVal = Math.max(...chartData.map(d => Math.max(d.b1, d.b2, d.b3)), 1);
  const yFmt   = (v: number) => fmtS(v, currency);

  // ── Asset allocation at retirement breakdown ────────────────────────────────
  const cashTotal   = config.assets.filter(a => a.assetClass === 'Cash').reduce((s, a) => s + a.currentValue, 0);
  const debtTotal   = config.assets.filter(a => a.assetClass === 'Debt').reduce((s, a) => s + a.currentValue, 0);
  const equityTotal = config.assets.filter(a => a.assetClass === 'Equity').reduce((s, a) => s + a.currentValue, 0);
  const total       = cashTotal + debtTotal + equityTotal || 1;

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white shadow-sm overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white text-sm tracking-tight">
            Strategy Comparison — Base Case
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            All three bucket strategies run on identical inputs · No bear case applied · {currency}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {results.map(({ key }) => {
            const m = STRATEGY_META[key];
            const isActive = activeStrategy === key;
            return (
              <span
                key={key}
                className="text-[10px] font-semibold rounded-full px-2.5 py-1 transition-all"
                style={isActive
                  ? { backgroundColor: m.color, color: '#fff' }
                  : { backgroundColor: '#1e293b', color: m.color, border: `1px solid ${m.color}40` }
                }
              >
                {m.label}
                {isActive && ' ◀'}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Bucket architecture legend ─────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-black/[0.06] border-b border-black/[0.06] bg-[#f9fafb]">
        {results.map(({ key }) => {
          const m = STRATEGY_META[key];
          const isActive = activeStrategy === key;
          return (
            <div
              key={key}
              className="px-4 py-3"
              style={{ borderTop: `3px solid ${m.color}` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="text-[11px] font-bold"
                  style={{ color: m.color }}
                >
                  {m.label}
                </span>
                {isActive && (
                  <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5">
                    active
                  </span>
                )}
              </div>
              <p className="text-[9.5px] text-slate-500 leading-snug">{m.sub}</p>

              {/* Allocation bar for this strategy's bucket structure */}
              {key === '1_BUCKET' && (
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: m.color }} />
              )}
              {key === '2_BUCKET' && (
                <div className="mt-2 flex h-2 rounded-full overflow-hidden gap-px">
                  <div className="h-full" style={{ width: `${((cashTotal + debtTotal) / total) * 100}%`, backgroundColor: '#7C3AED' }} />
                  <div className="h-full flex-1" style={{ backgroundColor: '#7C3AED80' }} />
                </div>
              )}
              {key === '3_BUCKET' && (
                <div className="mt-2 flex h-2 rounded-full overflow-hidden gap-px">
                  <div className="h-full" style={{ width: `${(cashTotal / total) * 100}%`, backgroundColor: '#16a34a' }} />
                  <div className="h-full" style={{ width: `${(debtTotal / total) * 100}%`, backgroundColor: '#2563EB' }} />
                  <div className="h-full flex-1" style={{ backgroundColor: '#7C3AED' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── KPI comparison table ───────────────────────────────────────── */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black/[0.06] bg-slate-50">
              <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[38%]">
                Metric
              </th>
              {results.map(({ key }) => (
                <th
                  key={key}
                  className="text-center px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: STRATEGY_META[key].color }}
                >
                  {STRATEGY_META[key].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpiRows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-black/[0.04] ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
              >
                <td className="px-5 py-2.5 text-[11px] text-slate-500">{row.label}</td>
                {results.map(({ key, result }) => (
                  <td key={key} className="px-3 py-2.5 text-center">
                    <span className="text-[12px] font-semibold text-slate-800">
                      {row.render(result)}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Trajectory chart ───────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Portfolio Trajectory — All Strategies
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Client Age', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#94a3b8' }}
            />
            <YAxis
              tickFormatter={yFmt}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              formatter={(value, name) => [typeof value === 'number' ? fmtS(value, currency) : String(value), String(name)]}
              labelFormatter={(age) => `Age ${age}`}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <Legend
              iconType="plainline"
              iconSize={20}
              wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            />
            <ReferenceLine
              x={retirementAge}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              label={{ value: `Retire ${retirementAge}`, position: 'top', fontSize: 9, fill: '#94a3b8' }}
            />
            <Line
              type="monotone"
              dataKey="b1"
              name="1-Bucket"
              stroke={STRATEGY_META['1_BUCKET'].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="b2"
              name="2-Bucket"
              stroke={STRATEGY_META['2_BUCKET'].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="b3"
              name="3-Bucket"
              stroke={STRATEGY_META['3_BUCKET'].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Insight strip ─────────────────────────────────────────────── */}
      <div className="mx-5 mb-5 rounded-xl border border-black/[0.06] bg-[#f8fafc] px-4 py-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Key Structural Differences
        </p>
        <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-500 leading-[1.55]">
          <div>
            <span className="font-semibold text-blue-600">1-Bucket — </span>
            Single blended pool. Simplest to manage. Return = weighted average of all asset class returns. No cascade — all outflows hit the unified total.
          </div>
          <div>
            <span className="font-semibold text-violet-600">2-Bucket — </span>
            Safety bucket (Cash + Debt) covers {config.bucket1TargetYears} yr{config.bucket1TargetYears !== 1 ? 's' : ''} of expenses at retirement; Growth bucket compounds in equity. B1 is drained to zero before B2 is touched.
          </div>
          <div>
            <span className="font-semibold text-emerald-600">3-Bucket — </span>
            Cash runway ({config.bucket1TargetYears} yr), Debt buffer ({config.bucket2TargetYears} yr), and Equity growth pool. Most granular liquidity management; B2 and B3 replenish B1 in sequence.
          </div>
        </div>
      </div>
    </div>
  );
}
