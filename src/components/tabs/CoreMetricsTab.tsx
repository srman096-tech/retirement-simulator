'use client';

import {
  MasterSimulatorConfig,
  SupportedCurrency,
  StrategyType,
  CURRENCY_LABELS,
  CURRENCY_SYMBOLS,
  FX_RATES,
  getEffectiveRate,
} from '@/types/workspace';
import SpendingSmileModule from '@/components/tabs/SpendingSmileModule';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import {
  ChevronUp,
  ChevronDown,
  Droplets,
  Landmark,
  TrendingUp,
  Percent,
  RotateCcw,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  fxStatus: 'loading' | 'live' | 'offline';
  fxLastUpdated: string | null;
  onRefreshFx: () => Promise<void>;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
      {children}
    </p>
  );
}

// ── Age stepper — full-width row layout ───────────────────────────────────────
function AgeStepper({
  label, value, min, max, onChange,
}: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[92px] shrink-0 leading-tight">
        {label}
      </p>
      <div className="flex-1 flex items-center bg-[#f6f7f9] border border-black/[0.08] rounded-lg px-3 py-2 gap-2">
        <span className="text-[15px] font-semibold text-[#111827] tabular-nums flex-1 select-none">
          {value}
        </span>
        <div className="flex flex-col gap-px">
          <button
            type="button"
            onClick={() => onChange(Math.min(max, value + 1))}
            className="w-4 h-[13px] flex items-center justify-center rounded-sm hover:bg-black/10 text-[#9ca3af] hover:text-[#111827] transition-colors"
            aria-label="Increase"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(min, value - 1))}
            className="w-4 h-[13px] flex items-center justify-center rounded-sm hover:bg-black/10 text-[#9ca3af] hover:text-[#111827] transition-colors"
            aria-label="Decrease"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Return rate row ───────────────────────────────────────────────────────────
function RateRow({
  icon, name, sub, value, color,
  onIncrease, onDecrease,
}: {
  icon: React.ReactNode;
  name: string;
  sub: string;
  value: number;
  color: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}18` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-[12px] font-semibold text-slate-800 leading-tight">{name}</p>
          <p className="text-[10px] text-slate-400">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="text-[15px] font-semibold tabular-nums min-w-[42px] text-right"
          style={{ color: '#111827' }}
        >
          {(value * 100).toFixed(1)}%
        </span>
        <div className="flex flex-col gap-[2px]">
          <button
            type="button"
            onClick={onIncrease}
            className="w-5 h-[18px] rounded-[5px] border border-black/[0.08] bg-[#f6f7f9] flex items-center justify-center text-[#6b7280] hover:bg-[#f0f2f5] hover:text-[#111827] transition-colors"
            aria-label={`Increase ${name}`}
          >
            <ChevronUp className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            onClick={onDecrease}
            className="w-5 h-[18px] rounded-[5px] border border-black/[0.08] bg-[#f6f7f9] flex items-center justify-center text-[#6b7280] hover:bg-[#f0f2f5] hover:text-[#111827] transition-colors"
            aria-label={`Decrease ${name}`}
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Strategy segmented toggle ─────────────────────────────────────────────────
const STRATEGIES: { value: StrategyType; label: string }[] = [
  { value: '1_BUCKET', label: '1-Bucket' },
  { value: '2_BUCKET', label: '2-Bucket' },
  { value: '3_BUCKET', label: '3-Bucket' },
];

const STRATEGY_DESCS: Record<StrategyType, string> = {
  '1_BUCKET': 'All assets in one pool. Outflows draw from the unified pot.',
  '2_BUCKET': 'Safety (Cash+Debt) + Growth (Equity). Cascade from Safety first.',
  '3_BUCKET': 'Cash → Debt → Equity cascade. B2 tops up B1; B3 tops up B2.',
};

// All currencies in order (for FX editor)
const ALL_CURRENCIES: SupportedCurrency[] = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD'];

// ── Main component ────────────────────────────────────────────────────────────
export default function CoreMetricsTab({ config, onUpdate, fxStatus, fxLastUpdated, onRefreshFx }: Props) {
  const { retirementAge, currentAge, lifeExpectancy, baseCurrency, strategy } = config;
  const accYears = Math.max(0, retirementAge - currentAge);
  const ddYears  = Math.max(0, lifeExpectancy - retirementAge);
  const sym      = CURRENCY_SYMBOLS[baseCurrency] ?? '₹';

  // All non-base currencies
  const foreignCurrencies = ALL_CURRENCIES.filter(c => c !== baseCurrency);

  // RetirementSimulator.onUpdate intercepts baseCurrency changes to re-seed
  // live FX rates and regional market defaults automatically.
  const handleCurrencyChange = (c: SupportedCurrency) =>
    onUpdate({ baseCurrency: c });

  const step = (key: keyof MasterSimulatorConfig, delta: number) => {
    const cur = config[key] as number;
    const next = Math.max(0, Math.round((cur + delta) * 1000) / 1000);
    onUpdate({ [key]: next } as Partial<MasterSimulatorConfig>);
  };

  // ── Age update handlers with cascade validation ───────────────────────────
  const handleCurrentAgeChange = (v: number) => {
    const updates: Partial<MasterSimulatorConfig> = { currentAge: v };
    if (v > retirementAge)  updates.retirementAge  = v;
    if (v >= lifeExpectancy) updates.lifeExpectancy = v + 1;
    onUpdate(updates);
  };

  const handleRetirementAgeChange = (v: number) => {
    const updates: Partial<MasterSimulatorConfig> = { retirementAge: v };
    if (v >= lifeExpectancy) updates.lifeExpectancy = v + 1;
    onUpdate(updates);
  };

  // ── FX override handlers ──────────────────────────────────────────────────
  const setFxOverride = (foreign: SupportedCurrency, rateStr: string) => {
    const rate = parseFloat(rateStr);
    if (!isFinite(rate) || rate <= 0) return;
    onUpdate({
      fxOverrides: { ...config.fxOverrides, [foreign]: rate },
    });
  };

  const resetFxOverride = (foreign: SupportedCurrency) => {
    const next = { ...config.fxOverrides };
    delete next[foreign];
    onUpdate({ fxOverrides: next });
  };

  const resetAllFxOverrides = () => onUpdate({ fxOverrides: {} });

  const hasAnyOverride = foreignCurrencies.some(c => config.fxOverrides[c] !== undefined);

  return (
    <div className="px-5 py-5 space-y-6">

      {/* ── Currency — inline label + select ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Base Currency</SectionLabel>
          <div className="mb-2.5">
            <Select
              value={config.baseCurrency}
              onValueChange={v => v && handleCurrencyChange(v as SupportedCurrency)}
            >
              <SelectTrigger className="h-8 text-sm font-medium w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CURRENCY_LABELS) as SupportedCurrency[]).map(c => (
                  <SelectItem key={c} value={c}>{CURRENCY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── FX rate editor ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-black/[0.08] bg-[#f8f9fa] px-3 py-2.5">
          <div className="flex items-center justify-between mb-2 gap-2">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">
              Rates · per 1 unit → {baseCurrency}
            </p>
            <div className="flex items-center gap-2 ml-auto">
              {/* Live / Offline status */}
              {fxStatus === 'live' && fxLastUpdated && (
                <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ECB · {fxLastUpdated}
                </span>
              )}
              {fxStatus === 'loading' && (
                <span className="text-[9px] text-slate-400 animate-pulse">Fetching…</span>
              )}
              {fxStatus === 'offline' && (
                <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5">
                  <WifiOff className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => onRefreshFx()}
                disabled={fxStatus === 'loading'}
                className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors"
                title="Refresh live rates"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${fxStatus === 'loading' ? 'animate-spin' : ''}`} />
              </button>

              {/* Reset all */}
              {hasAnyOverride && (
                <button
                  type="button"
                  onClick={resetAllFxOverrides}
                  className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-slate-600 transition-colors"
                  title="Reset all to live rates"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {foreignCurrencies.map(foreign => {
              const defaultRate = FX_RATES[baseCurrency] / FX_RATES[foreign];
              const effectiveRate = getEffectiveRate(foreign, baseCurrency, config.fxOverrides ?? {});
              const isOverridden = config.fxOverrides[foreign] !== undefined;

              return (
                <div key={foreign} className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 w-[30px] shrink-0">
                    {foreign}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">=</span>
                  <input
                    type="number"
                    min={0.000001}
                    step={0.01}
                    value={effectiveRate.toFixed(4)}
                    onChange={e => setFxOverride(foreign, e.target.value)}
                    className="flex-1 min-w-0 h-6 px-2 text-[11px] font-mono font-semibold text-slate-800 bg-white border border-black/[0.08] rounded-md outline-none focus:border-[--theme-primary] tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400 w-[26px] shrink-0">{baseCurrency}</span>
                  {isOverridden ? (
                    <button
                      type="button"
                      onClick={() => resetFxOverride(foreign)}
                      className="shrink-0 text-[#9ca3af] hover:text-slate-600 transition-colors"
                      title={`Reset to default (${defaultRate.toFixed(4)})`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="w-3 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Age Timeline — row layout, cascade validation ─────────────── */}
      <div>
        <SectionLabel>Age Timeline</SectionLabel>
        <div className="space-y-2">
          <AgeStepper
            label="Current Age"
            value={currentAge}
            min={18} max={89}
            onChange={handleCurrentAgeChange}
          />
          <AgeStepper
            label="Retirement"
            value={retirementAge}
            min={currentAge} max={90}
            onChange={handleRetirementAgeChange}
          />
          <AgeStepper
            label="Life Exp."
            value={lifeExpectancy}
            min={retirementAge + 1} max={110}
            onChange={v => onUpdate({ lifeExpectancy: v })}
          />
        </div>

        {/* Timeline bar visualization */}
        <div className="mt-3 relative">
          <div className="h-1.5 rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-l-full"
              style={{
                width: `${accYears > 0 ? Math.min(50, (accYears / (accYears + ddYears)) * 100) : 0}%`,
                backgroundColor: '#1D9E75',
                minWidth: accYears > 0 ? '4px' : '0',
              }}
            />
            <div
              className="h-full flex-1 rounded-r-full"
              style={{ backgroundColor: '#E6F1FB' }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
            <span>
              {accYears > 0
                ? <><span className="font-semibold text-[#1D9E75]">{accYears} yr</span> accumulation</>
                : <span className="text-slate-400">Retiring now</span>
              }
            </span>
            <span><span className="font-semibold text-[#378ADD]">{ddYears} yr</span> drawdown</span>
          </div>
        </div>
      </div>

      {/* ── Bucket Strategy ──────────────────────────────────────────── */}
      <div>
        <SectionLabel>Bucket Strategy</SectionLabel>
        <div className="flex gap-1 rounded-lg p-[3px] bg-[#f6f7f9] border border-black/[0.08]">
          {STRATEGIES.map(({ value, label }) => {
            const active = strategy === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onUpdate({ strategy: value })}
                className="flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all border"
                style={
                  active
                    ? {
                        backgroundColor: '#fff',
                        color: config.themePrimaryColor,
                        borderColor: 'rgba(0,0,0,0.08)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        borderColor: 'transparent',
                      }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
          {STRATEGY_DESCS[strategy]}
        </p>
      </div>

      {/* ── Monthly Costs ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Monthly Costs Post-Retirement</SectionLabel>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-[#6b7280] select-none pointer-events-none">
            {sym}
          </span>
          <input
            type="number"
            value={config.monthlyExpensesNative}
            onChange={e => onUpdate({ monthlyExpensesNative: parseFloat(e.target.value) || 0 })}
            className="w-full pl-7 pr-3 py-2.5 text-[14px] font-semibold text-[#111827] bg-[#f6f7f9] border border-black/[0.08] rounded-lg outline-none focus:border-[--theme-primary] tabular-nums"
            placeholder="e.g. 250000"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Annual: <span className="font-semibold text-slate-600">{formatCurrency(config.monthlyExpensesNative * 12, baseCurrency)}</span> today
        </p>
      </div>

      {/* ── Spending Smile Module ────────────────────────────────────── */}
      <div>
        <SectionLabel>Spending Profile</SectionLabel>
        <SpendingSmileModule config={config} onUpdate={onUpdate} />
      </div>

      {/* ── Bucket Replenishment Targets ────────────────────────────── */}
      {strategy !== '1_BUCKET' && (
        <div>
          <SectionLabel>Bucket Replenishment Targets</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">
                {strategy === '3_BUCKET' ? 'Cash (B1) — years' : 'Safety — years'}
              </p>
              <Input
                type="number" step={0.5} min={0.5} max={5}
                value={config.bucket1TargetYears}
                onChange={e => onUpdate({ bucket1TargetYears: parseFloat(e.target.value) || 1 })}
                className="h-8 text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                ≈ {formatCurrency(config.bucket1TargetYears * config.monthlyExpensesNative * 12, baseCurrency)}
              </p>
            </div>
            {strategy === '3_BUCKET' && (
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Debt (B2) — years</p>
                <Input
                  type="number" step={0.5} min={1} max={15}
                  value={config.bucket2TargetYears}
                  onChange={e => onUpdate({ bucket2TargetYears: parseFloat(e.target.value) || 1 })}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ≈ {formatCurrency(config.bucket2TargetYears * config.monthlyExpensesNative * 12, baseCurrency)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Annual Return Rates ──────────────────────────────────────── */}
      <div>
        <SectionLabel>Annual Return Rates</SectionLabel>
        <div className="rounded-xl border border-black/[0.08] bg-white px-4 divide-y divide-black/[0.04]">
          <RateRow
            icon={<Droplets className="w-4 h-4" />}
            name="Cash / liquid"
            sub="Savings, T-bills, liquid funds"
            value={config.cashReturnRate}
            color="#2563eb"
            onIncrease={() => step('cashReturnRate', 0.005)}
            onDecrease={() => step('cashReturnRate', -0.005)}
          />
          <RateRow
            icon={<Landmark className="w-4 h-4" />}
            name="Debt / conservative"
            sub="Bonds, debt MFs, NCDs"
            value={config.debtReturnRate}
            color="#2563eb"
            onIncrease={() => step('debtReturnRate', 0.005)}
            onDecrease={() => step('debtReturnRate', -0.005)}
          />
          <RateRow
            icon={<TrendingUp className="w-4 h-4" />}
            name="Equity / growth"
            sub="Equity MFs, stocks, real estate"
            value={config.equityReturnRate}
            color={config.themePrimaryColor}
            onIncrease={() => step('equityReturnRate', 0.005)}
            onDecrease={() => step('equityReturnRate', -0.005)}
          />
          <RateRow
            icon={<Percent className="w-4 h-4" />}
            name="Inflation rate"
            sub="General price level increase"
            value={config.inflationRate}
            color="#ef4444"
            onIncrease={() => step('inflationRate', 0.005)}
            onDecrease={() => step('inflationRate', -0.005)}
          />
        </div>
      </div>

    </div>
  );
}
