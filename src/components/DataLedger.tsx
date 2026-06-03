'use client';

import { useCallback, useMemo, Fragment } from 'react';
import { SimulationDataPoint, MarketStatus } from '@/lib/simulation';
import { MasterSimulatorConfig, StrategyType, SupportedCurrency, BearMarketScenario } from '@/types/workspace';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Column definitions by strategy ───────────────────────────────────────────
interface BucketCol {
  key: 'bucket1' | 'bucket2' | 'bucket3';
  shortLabel: string;
  color: string;
}

function getBucketCols(strategy: StrategyType): BucketCol[] {
  if (strategy === '1_BUCKET') return [
    { key: 'bucket1', shortLabel: 'Portfolio', color: '#7c3aed' },
  ];
  if (strategy === '2_BUCKET') return [
    { key: 'bucket1', shortLabel: 'Safety',    color: '#2563eb' },
    { key: 'bucket2', shortLabel: 'Growth',    color: '#7c3aed' },
  ];
  return [
    { key: 'bucket1', shortLabel: 'Cash',      color: '#16a34a' },
    { key: 'bucket2', shortLabel: 'Debt',      color: '#2563eb' },
    { key: 'bucket3', shortLabel: 'Equity',    color: '#7c3aed' },
  ];
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MarketStatus }) {
  const cfg: Record<MarketStatus, { bg: string; text: string; dot: string; label: string }> = {
    ACCUMULATION: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'Accumulation' },
    GROWTH:       { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Growth'       },
    CRASH:        { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444', label: 'Crash'        },
    RECOVERY:     { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'Recovery'     },
  };
  const s = cfg[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Mini health bar ───────────────────────────────────────────────────────────
function HealthBar({ ratio }: { ratio: number }) {
  const pct   = Math.min(1, Math.max(0, ratio));
  const color = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-16 h-[3px] rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Section divider row ───────────────────────────────────────────────────────
function SectionRow({ colSpan, label, color, bg }: {
  colSpan: number; label: string; color: string; bg: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-0 py-0">
        <div
          className="flex items-center gap-2 px-4 py-1 text-[10px] font-bold tracking-wider uppercase"
          style={{ backgroundColor: bg, color, borderLeft: `3px solid ${color}` }}
        >
          {label}
        </div>
      </td>
    </tr>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(
  dataPoints: SimulationDataPoint[],
  strategy: StrategyType,
  currency: SupportedCurrency,
) {
  const cols = getBucketCols(strategy);
  const headers = [
    'Age', 'Calendar Year', 'Market Status',
    'Annual Expense', 'Milestone Outflow', 'Milestone Inflow',
    ...cols.map(c => c.shortLabel),
    'Total Net Worth (Nominal)',
    'Real Value (Today\'s Money)',
  ];
  const rows = dataPoints.map(dp => [
    dp.age, dp.calendarYear, dp.marketStatus,
    dp.annualExpense.toFixed(0), dp.annualOutflow.toFixed(0), dp.annualInflow.toFixed(0),
    ...cols.map(c => dp[c.key].toFixed(0)),
    dp.total.toFixed(0),
    dp.realTotal.toFixed(0),
  ]);
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `portfolio-ledger-${currency}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface DataLedgerProps {
  config: MasterSimulatorConfig;
  baseDataPoints: SimulationDataPoint[];
  crashDataPoints: SimulationDataPoint[];
}

export default function DataLedger({ config, baseDataPoints, crashDataPoints }: DataLedgerProps) {
  const {
    strategy, baseCurrency, bearCaseEnabled,
    lifeExpectancy, retirementAge, currentAge, themePrimaryColor,
  } = config;

  const currency   = baseCurrency as SupportedCurrency;
  const dataPoints = bearCaseEnabled ? crashDataPoints : baseDataPoints;
  const cols       = getBucketCols(strategy);
  const fmtS = (v: number) => formatCurrencyShort(v, currency);
  const fmt  = (v: number) => formatCurrency(v, currency);

  // Derived stats
  const peakTotal  = useMemo(() => Math.max(...dataPoints.map(d => d.total), 1), [dataPoints]);
  const peakPoint  = useMemo(
    () => dataPoints.reduce((best, dp) => dp.total > best.total ? dp : best, dataPoints[0]),
    [dataPoints],
  );
  const firstPoint     = dataPoints[0];
  const lastPoint      = dataPoints[dataPoints.length - 1];
  const exhaustionIdx  = dataPoints.findIndex(dp => dp.total <= 0 && dp.age > currentAge);
  const exhaustionAge  = exhaustionIdx >= 0 ? dataPoints[exhaustionIdx].age : null;

  // Crash trigger ages (for section markers)
  const crashAgeSet = useMemo(() => {
    if (!bearCaseEnabled) return new Set<number>();
    return new Set(
      config.bearMarketScenarios
        .filter((s: BearMarketScenario) => s.enabled)
        .map((s: BearMarketScenario) => s.crashAge),
    );
  }, [bearCaseEnabled, config.bearMarketScenarios]);

  const handleExport = useCallback(
    () => exportCSV(dataPoints, strategy, currency),
    [dataPoints, strategy, currency],
  );

  // total columns: Age/Yr | Status | Outflow | Inflow | [bucket cols] | Net Worth | Real Value
  const totalCols = 4 + cols.length + 2;

  return (
    <div
      className="rounded-xl border-2 bg-white shadow-sm overflow-hidden"
      style={{ borderColor: `${themePrimaryColor}40` }}
    >
      {/* ── Dark header band ─────────────────────────────────────────── */}
      <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white text-sm tracking-tight">Year-by-Year Portfolio Ledger</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {bearCaseEnabled ? 'Bear-case overlay active' : 'Base case'}
            &nbsp;&middot;&nbsp;{dataPoints.length} rows
            &nbsp;&middot;&nbsp;Peak: <span className="text-slate-200 font-semibold">{fmt(peakTotal)}</span> at age {peakPoint?.age}
            {exhaustionAge && (
              <span className="ml-2 text-red-400 font-semibold">&middot; Exhaustion age {exhaustionAge}</span>
            )}
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          className="gap-1.5 text-[11px] border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white shrink-0"
          onClick={handleExport}
        >
          <Download className="w-3 h-3" />
          Export CSV
        </Button>
      </div>

      {/* ── Summary stat strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 bg-slate-50">
        {[
          {
            label: 'Starting Portfolio',
            value: fmt(firstPoint?.total ?? 0),
            icon: <TrendingUp className="w-3 h-3 text-slate-400" />,
            cls: 'text-slate-900',
          },
          {
            label: `Terminal Estate (nominal / real)`,
            value: (lastPoint?.total ?? 0) > 0
              ? `${fmt(lastPoint!.total)} / ${fmt(lastPoint!.realTotal)}`
              : '— / —',
            icon: (lastPoint?.total ?? 0) > 0
              ? <TrendingUp className="w-3 h-3 text-green-500" />
              : <TrendingDown className="w-3 h-3 text-red-500" />,
            cls: (lastPoint?.total ?? 0) <= 0 ? 'text-red-600' : 'text-slate-900',
          },
          {
            label: 'Capital Status',
            value: exhaustionAge
              ? `Shortfall @ age ${exhaustionAge}`
              : `Funded to age ${lifeExpectancy}+`,
            icon: exhaustionAge
              ? <TrendingDown className="w-3 h-3 text-red-500" />
              : <TrendingUp className="w-3 h-3 text-green-500" />,
            cls: exhaustionAge ? 'text-red-600' : 'text-green-700',
          },
        ].map(stat => (
          <div key={stat.label} className="px-4 py-2.5">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {stat.icon}
              <p className={`text-xs font-bold truncate ${stat.cls}`}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
        <table className="w-full text-xs">

          {/* Sticky column headers */}
          <thead className="sticky top-0 z-10 bg-slate-800">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-slate-300 whitespace-nowrap">
                Age / Yr
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-slate-300 whitespace-nowrap">
                Status
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-red-400 whitespace-nowrap">
                Outflow
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-green-400 whitespace-nowrap">
                Inflow
              </th>
              {cols.map(col => (
                <th
                  key={col.key}
                  className="text-right px-3 py-2.5 font-semibold text-[10px] uppercase tracking-wider whitespace-nowrap"
                  style={{ color: col.color }}
                >
                  {col.shortLabel}
                </th>
              ))}
              <th className="text-right px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-slate-300 whitespace-nowrap">
                Net Worth
              </th>
              <th className="text-right px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wider text-violet-300 whitespace-nowrap">
                Real Value
              </th>
            </tr>
          </thead>

          <tbody>
            {dataPoints.map((dp, idx) => {
              const isCrash      = dp.marketStatus === 'CRASH';
              const isRetire     = dp.age === retirementAge;
              const isCrashTrig  = crashAgeSet.has(dp.age);
              const isFirstExhaust = exhaustionIdx >= 0 && idx === exhaustionIdx;
              const healthRatio  = peakTotal > 0 ? dp.total / peakTotal : 0;
              const totalOutflow = dp.annualExpense + dp.annualOutflow;

              const crashScenario = isCrashTrig
                ? config.bearMarketScenarios.find(
                    (s: BearMarketScenario) => s.enabled && s.crashAge === dp.age,
                  )
                : null;

              return (
                <Fragment key={dp.age}>
                  {/* Retirement boundary */}
                  {isRetire && (
                    <SectionRow
                      colSpan={totalCols}
                      label={`◆  Retirement begins — age ${retirementAge}`}
                      color={themePrimaryColor}
                      bg={`${themePrimaryColor}12`}
                    />
                  )}

                  {/* Crash trigger */}
                  {isCrashTrig && crashScenario && (
                    <SectionRow
                      colSpan={totalCols}
                      label={`▼  ${crashScenario.label} — equity −${(crashScenario.drawdownPct * 100).toFixed(0)}% crash event`}
                      color="#dc2626"
                      bg="#fff1f2"
                    />
                  )}

                  {/* Capital exhaustion */}
                  {isFirstExhaust && (
                    <SectionRow
                      colSpan={totalCols}
                      label={`⚠  Capital exhaustion boundary — age ${dp.age}`}
                      color="#dc2626"
                      bg="#fee2e2"
                    />
                  )}

                  {/* Data row */}
                  <tr
                    className={`border-b transition-colors ${
                      isCrash
                        ? 'border-l-2 border-l-red-400 bg-red-50/25 border-b-red-100'
                        : idx % 2 === 0
                        ? 'bg-white border-b-slate-50'
                        : 'bg-slate-50/50 border-b-slate-100'
                    }`}
                  >
                    {/* Age + Year */}
                    <td className="px-4 py-2">
                      <div className="font-bold text-slate-900 tabular-nums">{dp.age}</div>
                      <div className="text-[10px] text-slate-400 tabular-nums">{dp.calendarYear}</div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <StatusBadge status={dp.marketStatus} />
                    </td>

                    {/* Outflow */}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {totalOutflow > 0
                        ? <span className="font-medium text-red-600">−{fmtS(totalOutflow)}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>

                    {/* Inflow */}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {dp.annualInflow > 0
                        ? <span className="font-medium text-emerald-600">+{fmtS(dp.annualInflow)}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>

                    {/* Bucket columns */}
                    {cols.map(col => (
                      <td key={col.key} className="px-3 py-2 text-right tabular-nums">
                        {dp[col.key] > 0
                          ? <span className="font-medium" style={{ color: col.color }}>{fmtS(dp[col.key])}</span>
                          : <span className="text-slate-200">—</span>}
                      </td>
                    ))}

                    {/* Net Worth + health bar */}
                    <td className="px-4 py-2 text-right">
                      <div className={`font-bold tabular-nums text-[12px] leading-tight ${dp.total <= 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {dp.total <= 0 ? '—' : fmt(dp.total)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {dp.total > 0 && (
                          <span className="text-[9px] text-slate-400 tabular-nums">
                            {(healthRatio * 100).toFixed(0)}%
                          </span>
                        )}
                        <HealthBar ratio={healthRatio} />
                      </div>
                    </td>

                    {/* Real Value (inflation-adjusted) */}
                    <td className="px-4 py-2 text-right">
                      <div className={`tabular-nums text-[11px] leading-tight ${dp.realTotal <= 0 ? 'text-slate-300' : 'text-violet-600 font-medium'}`}>
                        {dp.realTotal <= 0 ? '—' : fmtS(dp.realTotal)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">today's {currency}</div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-4 flex-wrap">
          {cols.map(col => (
            <div key={col.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col.color }} />
              <span className="text-[10px] text-slate-500">{col.shortLabel}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-10 h-[3px] rounded-full bg-slate-200">
              <div className="w-3/4 h-full rounded-full bg-green-500" />
            </div>
            <span className="text-[10px] text-slate-400">Portfolio health</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 tabular-nums shrink-0">
          {currency} · Base year {firstPoint?.calendarYear ?? '—'}
        </p>
      </div>
    </div>
  );
}
