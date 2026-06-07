'use client';

import { useCallback, useMemo, useState, Fragment } from 'react';
import { SimulationDataPoint, MarketStatus } from '@/lib/simulation';
import {
  MasterSimulatorConfig, StrategyType, SupportedCurrency,
  BearMarketScenario, InitialRebalancePolicy,
} from '@/types/workspace';
import { formatCurrencyShort, formatCurrency } from '@/lib/formatters';
import { Download, TrendingUp, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Column helpers ─────────────────────────────────────────────────────────────
interface BucketCol {
  key: 'bucket1' | 'bucket2' | 'bucket3';
  label: string;
  color: string;
}
function getBucketCols(strategy: StrategyType): BucketCol[] {
  if (strategy === '1_BUCKET') return [
    { key: 'bucket1', label: 'Portfolio',  color: '#7c3aed' },
  ];
  if (strategy === '2_BUCKET') return [
    { key: 'bucket1', label: 'B1 Safety',  color: '#2563eb' },
    { key: 'bucket2', label: 'B2 Growth',  color: '#7c3aed' },
  ];
  return [
    { key: 'bucket1', label: 'B1 Cash',    color: '#16a34a' },
    { key: 'bucket2', label: 'B2 Debt',    color: '#2563eb' },
    { key: 'bucket3', label: 'B3 Equity',  color: '#7c3aed' },
  ];
}

function bucketStartKey(key: BucketCol['key']): 'bucket1Start' | 'bucket2Start' | 'bucket3Start' {
  return (key + 'Start') as 'bucket1Start' | 'bucket2Start' | 'bucket3Start';
}
function bucketDrawKey(key: BucketCol['key']): 'drawFromB1ForExpense' | 'drawFromB2ForExpense' | 'drawFromB3ForExpense' {
  const map = { bucket1: 'drawFromB1ForExpense', bucket2: 'drawFromB2ForExpense', bucket3: 'drawFromB3ForExpense' } as const;
  return map[key];
}

// ── System Health ─────────────────────────────────────────────────────────────
type HealthStatus = 'HEALTHY' | 'GROWTH_ENGINE_TAPPED' | 'CRITICAL_RUNWAY' | 'CAPITAL_EXHAUSTED';

function getSystemHealth(
  dp: SimulationDataPoint,
  retirementAge: number,
  strategy: StrategyType,
): HealthStatus {
  if (dp.age <= retirementAge) return 'HEALTHY'; // accumulation years always healthy
  if (dp.total <= 0) return 'CAPITAL_EXHAUSTED';

  const annualNeed = dp.inflatedNeed || dp.annualExpense;
  if (annualNeed > 0 && dp.total / annualNeed < 3) return 'CRITICAL_RUNWAY';

  // Drawing from equity because B1 (and B2 for 3-bucket) are empty
  if (strategy === '3_BUCKET' && dp.bucket1 <= 0 && dp.bucket2 <= 0 && dp.bucket3 > 0)
    return 'GROWTH_ENGINE_TAPPED';
  if (strategy === '2_BUCKET' && dp.bucket1 <= 0 && dp.bucket2 > 0)
    return 'GROWTH_ENGINE_TAPPED';

  return 'HEALTHY';
}

function HealthBadge({ status }: { status: HealthStatus }) {
  const cfg = {
    HEALTHY:              { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'HEALTHY 🟢'              },
    GROWTH_ENGINE_TAPPED: { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'GROWTH ENGINE TAPPED 🟡' },
    CRITICAL_RUNWAY:      { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'CRITICAL RUNWAY 🟠'      },
    CAPITAL_EXHAUSTED:    { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444', label: 'CAPITAL EXHAUSTED 🔴'    },
  };
  const s = cfg[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
      {s.label}
    </span>
  );
}

// ── Eq Return display ──────────────────────────────────────────────────────────
function EqReturnCell({ rate, marketStatus, haircutPct }: { rate: number; marketStatus: MarketStatus; haircutPct?: number }) {
  const isNeg   = rate < 0;
  const pctStr  = `${isNeg ? '' : '+'}${(rate * 100).toFixed(1)}%`;
  const color   = isNeg ? '#dc2626' : '#16a34a';

  const phaseLabel = marketStatus === 'CRASH' ? '🐻 Crash Meltdown'
                   : marketStatus === 'RECOVERY' ? '📈 Recovery Clawback'
                   : null;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-bold tabular-nums text-[11px]" style={{ color }}>{pctStr}</span>
      {phaseLabel && <span className="text-[8px] font-semibold text-slate-600">{phaseLabel}</span>}
      {haircutPct && <span className="text-[9px] text-blue-500">−{(haircutPct*100).toFixed(0)}% spend</span>}
    </div>
  );
}

// ── Section divider row ────────────────────────────────────────────────────────
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

// ── Mini health bar ────────────────────────────────────────────────────────────
function HealthBar({ ratio }: { ratio: number }) {
  const pct   = Math.min(1, Math.max(0, ratio));
  const color = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-14 h-[3px] rounded-full bg-slate-100 overflow-hidden mt-0.5">
      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
    </div>
  );
}

// ── CSV export ─────────────────────────────────────────────────────────────────
function exportCSV(
  dataPoints: SimulationDataPoint[],
  strategy: StrategyType,
  currency: SupportedCurrency,
) {
  const cols = getBucketCols(strategy);
  const headers = [
    'Age', 'Calendar Year', 'Market Status', 'Eq Return %',
    'Inflated Need', 'Actual Withdrawal',
    'Milestone Outflow', 'Income Inflow',
    ...cols.map(c => `${c.label} End Balance`),
    'Total Net Worth (Nominal)', 'Real Purchasing Power',
    'System Health',
  ];
  const rows = dataPoints.map(dp => [
    dp.age, dp.calendarYear, dp.marketStatus,
    (dp.equityEffectiveRate * 100).toFixed(1),
    dp.inflatedNeed.toFixed(0), dp.actualLivingWithdrawn.toFixed(0),
    dp.annualOutflow.toFixed(0), dp.annualInflow.toFixed(0),
    ...cols.map(c => dp[c.key].toFixed(0)),
    dp.total.toFixed(0),
    dp.realTotal.toFixed(0),
    getSystemHealth(dp, 0, strategy),
  ]);
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `portfolio-ledger-${currency}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Expandable bucket sub-row ──────────────────────────────────────────────────
function BucketExpandedRow({
  dp, cols, currency, totalCols,
}: {
  dp: SimulationDataPoint;
  cols: BucketCol[];
  currency: SupportedCurrency;
  totalCols: number;
}) {
  const fmtS = (v: number) => formatCurrencyShort(v, currency);
  return (
    <tr className="bg-slate-50/80 border-b border-slate-200">
      <td colSpan={totalCols} className="px-4 pt-1 pb-2">
        <div className="flex flex-wrap gap-4">
          {cols.map(col => {
            const startKey  = bucketStartKey(col.key);
            const drawKey   = bucketDrawKey(col.key);
            const start     = dp[startKey] ?? 0;
            const draw      = dp[drawKey]  ?? 0;
            const refillIn  = col.key === 'bucket1' ? dp.refillB1FromB2
                            : col.key === 'bucket2' ? dp.refillB2FromB3 : 0;
            const refillOut = col.key === 'bucket2' ? dp.refillB1FromB2
                            : col.key === 'bucket3' ? dp.refillB2FromB3 : 0;
            const end       = dp[col.key];

            const rows: { label: string; value: number; sign: '+' | '−' | '=' | '~' }[] = [
              { label: 'Start',      value: start,     sign: '~' },
              ...(draw     > 0 ? [{ label: 'Expense Draw', value: draw,     sign: '−' as const }] : []),
              ...(refillIn > 0 ? [{ label: 'Refill In',   value: refillIn,  sign: '+' as const }] : []),
              ...(refillOut> 0 ? [{ label: 'Refill Out',  value: refillOut, sign: '−' as const }] : []),
              { label: 'End (incl. returns)', value: end, sign: '=' },
            ];

            return (
              <div key={col.key} className="min-w-[150px]">
                <p
                  className="text-[9px] font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: col.color }}
                >
                  {col.label}
                </p>
                <div className="space-y-0.5">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-[9px] text-slate-400">{r.label}</span>
                      <span
                        className="text-[10px] font-mono tabular-nums font-semibold"
                        style={{
                          color: r.sign === '+'  ? '#16a34a'
                               : r.sign === '−'  ? '#dc2626'
                               : r.sign === '='  ? col.color
                               : '#475569',
                        }}
                      >
                        {r.sign === '~' || r.sign === '=' ? '' : r.sign}
                        {fmtS(r.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
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
  const fmtS       = (v: number) => formatCurrencyShort(v, currency);
  const fmt        = (v: number) => formatCurrency(v, currency);

  // ── Expandable row state ──────────────────────────────────────────────────
  const [expandedAges, setExpandedAges] = useState<Set<number>>(new Set());
  const toggleExpand = (age: number) =>
    setExpandedAges(prev => {
      const next = new Set(prev);
      next.has(age) ? next.delete(age) : next.add(age);
      return next;
    });

  // Derived stats
  const peakTotal     = useMemo(() => Math.max(...dataPoints.map(d => d.total), 1), [dataPoints]);
  const peakPoint     = useMemo(
    () => dataPoints.reduce((best, dp) => dp.total > best.total ? dp : best, dataPoints[0]),
    [dataPoints],
  );
  const firstPoint    = dataPoints[0];
  const lastPoint     = dataPoints[dataPoints.length - 1];
  const exhaustionIdx = dataPoints.findIndex(dp => dp.total <= 0 && dp.age > currentAge);
  const exhaustionAge = exhaustionIdx >= 0 ? dataPoints[exhaustionIdx].age : null;

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

  const isDriftPolicy = (config.initialRebalancePolicy ?? 'FORCE_TARGET_ON_RETIREMENT') === 'RUN_CURRENT_ALLOCATION';

  // Columns: Age/Yr + expand toggle | Eq Return | Inflated Need | Actual Withdrawal | [bucket cols] | Net Worth | Real Value | System Health
  const totalCols = 4 + cols.length + 3;

  return (
    <div
      className="rounded-xl border-2 bg-white shadow-sm overflow-hidden"
      style={{ borderColor: `${themePrimaryColor}40` }}
    >
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white text-sm tracking-tight">Year-by-Year Portfolio Ledger</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {bearCaseEnabled ? 'Bear-case overlay active' : 'Base case'}
            &nbsp;·&nbsp;{dataPoints.length} rows
            &nbsp;·&nbsp;Peak: <span className="text-slate-200 font-semibold">{fmt(peakTotal)}</span> at age {peakPoint?.age}
            {exhaustionAge && (
              <span className="ml-2 text-red-400 font-semibold">· Exhaustion age {exhaustionAge}</span>
            )}
            <span className="ml-2 text-slate-500">· Click any row to expand bucket detail</span>
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
            label: 'Terminal Estate (nominal / real)',
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
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-xs min-w-[900px]">

          {/* Column group headers */}
          <thead className="sticky top-0 z-10">
            {/* Section group row */}
            <tr className="bg-slate-900 border-b border-slate-700">
              <th colSpan={2} className="text-center px-3 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-widest border-r border-slate-700">
                Timeline
              </th>
              <th colSpan={2} className="text-center px-3 py-1.5 text-[9px] font-semibold text-amber-400 uppercase tracking-widest border-r border-slate-700">
                Outflows
              </th>
              <th colSpan={cols.length} className="text-center px-3 py-1.5 text-[9px] font-semibold text-blue-300 uppercase tracking-widest border-r border-slate-700">
                Bucket End Balances
              </th>
              <th colSpan={2} className="text-center px-3 py-1.5 text-[9px] font-semibold text-violet-300 uppercase tracking-widest border-r border-slate-700">
                Summary
              </th>
              <th className="text-center px-3 py-1.5 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                Status
              </th>
            </tr>
            {/* Column headers */}
            <tr className="bg-slate-800">
              <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
                Age / Yr
              </th>
              <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
                Eq Return
              </th>
              <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-amber-300 whitespace-nowrap">
                Inflated Need
              </th>
              <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-amber-200 whitespace-nowrap border-r border-slate-700">
                Actual Withdrawal
              </th>
              {cols.map(col => (
                <th
                  key={col.key}
                  className="text-right px-3 py-2.5 text-[10px] font-semibold whitespace-nowrap"
                  style={{ color: col.color }}
                >
                  {col.label}
                </th>
              ))}
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-slate-300 whitespace-nowrap border-l border-slate-700">
                Net Worth
              </th>
              <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-violet-300 whitespace-nowrap">
                Real Purchasing Power
              </th>
              <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-300 whitespace-nowrap">
                System Health
              </th>
            </tr>
          </thead>

          <tbody>
            {dataPoints.map((dp, idx) => {
              const isCrash       = dp.marketStatus === 'CRASH';
              const isRetire      = dp.age === retirementAge;
              const isCrashTrig   = crashAgeSet.has(dp.age);
              const isFirstExhaust = exhaustionIdx >= 0 && idx === exhaustionIdx;
              const healthRatio   = peakTotal > 0 ? dp.total / peakTotal : 0;
              const isExpanded    = expandedAges.has(dp.age);
              const healthStatus  = getSystemHealth(dp, retirementAge, strategy);
              const isPostRetire  = dp.age > retirementAge;

              // Downturn haircut indicator
              const haircutActive = dp.isInCrashWindow && config.bearCaseEnabled && config.enableDownturnHaircut && isPostRetire;
              const haircutPct    = haircutActive ? (config.downturnExpenseCutPercent ?? 0) : undefined;

              // Withdrawal gap (inflated need vs actual — shows depletion or haircut)
              const withdrawalGap = dp.inflatedNeed > 0 && dp.actualLivingWithdrawn < dp.inflatedNeed - 1;

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
                      label={`◆  Retirement begins — age ${retirementAge}${
                        isDriftPolicy
                          ? '  ·  Maintaining current holdings (no rebalance)'
                          : '  ·  Buckets restructured to targets on Day 1'
                      }`}
                      color={themePrimaryColor}
                      bg={`${themePrimaryColor}12`}
                    />
                  )}

                  {/* Drift-policy B1 gap warning */}
                  {isRetire && isDriftPolicy && strategy !== '1_BUCKET' && dp.bucket1 < dp.annualExpense && (
                    <SectionRow
                      colSpan={totalCols}
                      label="⚠  Cash (B1) below 1-yr expense target — drawdowns will pull from Debt or Equity immediately"
                      color="#b45309"
                      bg="#fffbeb"
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

                  {/* ── Main data row ─────────────────────────────────────── */}
                  <tr
                    className={`border-b transition-colors cursor-pointer select-none ${
                      isCrash
                        ? 'border-l-2 border-l-red-400 bg-red-50/25 border-b-red-100'
                        : isExpanded
                        ? 'bg-slate-50 border-b-slate-200'
                        : idx % 2 === 0
                        ? 'bg-white border-b-slate-50 hover:bg-slate-50/60'
                        : 'bg-slate-50/50 border-b-slate-100 hover:bg-slate-100/60'
                    }`}
                    onClick={() => toggleExpand(dp.age)}
                  >
                    {/* Age / Year + expand toggle */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-300 shrink-0 mt-0.5">
                          {isExpanded
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 tabular-nums">{dp.age}</div>
                          <div className="text-[10px] text-slate-400 tabular-nums">{dp.calendarYear}</div>
                        </div>
                      </div>
                    </td>

                    {/* Eq Return */}
                    <td className="px-3 py-2 text-center">
                      <EqReturnCell
                        rate={dp.equityEffectiveRate}
                        marketStatus={dp.marketStatus}
                        haircutPct={haircutPct}
                      />
                    </td>

                    {/* Inflated Need */}
                    <td className="px-3 py-2 text-right tabular-nums">
                      {dp.inflatedNeed > 0
                        ? <span className="text-amber-700 font-medium">{fmtS(dp.inflatedNeed)}</span>
                        : <span className="text-slate-200">—</span>}
                    </td>

                    {/* Actual Withdrawal */}
                    <td className="px-3 py-2 text-right tabular-nums border-r border-black/[0.04]">
                      {dp.actualLivingWithdrawn > 0 ? (
                        <div>
                          <span className={`font-medium ${withdrawalGap ? 'text-red-500' : 'text-red-600'}`}>
                            −{fmtS(dp.actualLivingWithdrawn)}
                          </span>
                          {withdrawalGap && (
                            <div className="text-[9px] text-red-400 font-semibold">⚡ gap</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>

                    {/* Bucket end balances */}
                    {cols.map(col => {
                      const val = dp[col.key];
                      const showB1Warn =
                        col.key === 'bucket1' && isPostRetire && isDriftPolicy &&
                        strategy !== '1_BUCKET' && val <= 0;
                      return (
                        <td key={col.key} className="px-3 py-2 text-right tabular-nums">
                          {val > 0 ? (
                            <span className="font-medium" style={{ color: col.color }}>{fmtS(val)}</span>
                          ) : showB1Warn ? (
                            <span className="text-amber-600 font-semibold text-[10px]">⚠ Depleted</span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Net Worth + health bar */}
                    <td className="px-4 py-2 text-right border-l border-black/[0.04]">
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

                    {/* Real Purchasing Power */}
                    <td className="px-4 py-2 text-right">
                      <div className={`tabular-nums text-[11px] leading-tight ${dp.realTotal <= 0 ? 'text-slate-300' : 'text-violet-600 font-medium'}`}>
                        {dp.realTotal <= 0 ? '—' : fmtS(dp.realTotal)}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">today's {currency}</div>
                    </td>

                    {/* System Health */}
                    <td className="px-4 py-2 text-center">
                      {isPostRetire || dp.total <= 0
                        ? <HealthBadge status={healthStatus} />
                        : <span className="text-[9px] text-slate-300">—</span>}
                    </td>
                  </tr>

                  {/* ── Expanded bucket detail sub-row ────────────────── */}
                  {isExpanded && (
                    <BucketExpandedRow
                      dp={dp}
                      cols={cols}
                      currency={currency}
                      totalCols={totalCols}
                    />
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-100 bg-slate-50 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {cols.map(col => (
            <div key={col.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: col.color }} />
              <span className="text-[10px] text-slate-500">{col.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">🟢 Healthy · 🟡 Growth Tapped · 🟠 Critical · 🔴 Exhausted</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 tabular-nums shrink-0">
          {currency} · Base year {firstPoint?.calendarYear ?? '—'} · Click row to expand buckets
        </p>
      </div>
    </div>
  );
}
