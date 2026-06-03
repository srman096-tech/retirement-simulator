import { SimulationResult } from '@/lib/simulation';
import { formatCurrency } from '@/lib/formatters';
import { MasterSimulatorConfig, SupportedCurrency } from '@/types/workspace';
import { CheckCircle, Infinity, TrendingUp, AlertCircle } from 'lucide-react';

interface KPICardsProps {
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
}

// Semantic accent colors (fixed, not theme — matches HTML spec)
const ACCENT = {
  green:  '#1D9E75',
  blue:   '#378ADD',
  purple: '#7F77DD',
  red:    '#D85A30',
};

export default function KPICards({ config, baseResult, crashResult }: KPICardsProps) {
  const { lifeExpectancy, bearCaseEnabled, baseCurrency } = config;
  const fmt = (v: number) => formatCurrency(v, baseCurrency as SupportedCurrency);

  // When stress is ON → primary = bear case, comparison = base case
  // When stress is OFF → primary = base case, no comparison
  const primary   = bearCaseEnabled ? crashResult : baseResult;
  const secondary = bearCaseEnabled ? baseResult  : null;

  const isFundedPrimary = primary.isFunded;
  const horizonPrimary  = !primary.exhaustionAge || primary.exhaustionAge >= lifeExpectancy;
  const estatePositive  = primary.finalEstateValue > 0;

  // Compact comparison label used in secondary rows
  const isFundedBase  = secondary?.isFunded ?? true;
  const horizonBase   = !secondary?.exhaustionAge || (secondary?.exhaustionAge ?? lifeExpectancy) >= lifeExpectancy;
  const estateBase    = secondary?.finalEstateValue ?? 0;

  // Real (inflation-adjusted) terminal values
  const estateRealPrimary  = primary.finalEstateValueReal;
  const estateRealBase     = secondary?.finalEstateValueReal ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">

      {/* ── Card 1: Structural Health ───────────────────────────── */}
      <div
        className="bg-white rounded-xl border border-black/[0.08] shadow-sm overflow-hidden relative pl-[3px]"
        style={{ borderLeftColor: isFundedPrimary ? ACCENT.green : ACCENT.red, borderLeftWidth: 3 }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9ca3af]">
                Structural health
              </p>
              {bearCaseEnabled && (
                <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-px bg-[#FAECE7] text-[#993C1D]">
                  Stressed
                </span>
              )}
            </div>
            {isFundedPrimary ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#E1F5EE] text-[#0F6E56]">
                <CheckCircle className="w-3 h-3" /> Funded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#FAECE7] text-[#993C1D]">
                <AlertCircle className="w-3 h-3" /> Shortfall
              </span>
            )}
          </div>
          <p
            className="text-[17px] font-semibold leading-snug mb-1"
            style={{ color: isFundedPrimary ? ACCENT.green : ACCENT.red }}
          >
            {isFundedPrimary ? 'Portfolio fully funded' : 'Shortfall risk alert'}
          </p>
          <p className="text-[11px] text-[#6b7280]">
            {isFundedPrimary
              ? `All obligations met through age ${lifeExpectancy}`
              : `Portfolio exhausted before age ${lifeExpectancy}`}
          </p>
          {secondary && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-black/[0.06] text-[10px]">
              <span className="text-[#9ca3af]">Base case:</span>
              <span className="font-semibold" style={{ color: isFundedBase ? ACCENT.green : ACCENT.red }}>
                {isFundedBase ? 'Funded ✓' : 'Shortfall'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Card 2: Capital Horizon ──────────────────────────────── */}
      <div
        className="bg-white rounded-xl border border-black/[0.08] shadow-sm overflow-hidden"
        style={{ borderLeftColor: horizonPrimary ? ACCENT.blue : ACCENT.red, borderLeftWidth: 3 }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9ca3af]">
                Capital horizon
              </p>
              {bearCaseEnabled && (
                <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-px bg-[#FAECE7] text-[#993C1D]">
                  Stressed
                </span>
              )}
            </div>
            {horizonPrimary ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#E6F1FB] text-[#185FA5]">
                <Infinity className="w-3 h-3" /> Sustainable
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#FAECE7] text-[#993C1D]">
                <AlertCircle className="w-3 h-3" /> Exhausted
              </span>
            )}
          </div>
          <p className="text-[27px] font-semibold text-[#111827] tracking-[-0.02em] leading-none mb-1.5">
            {horizonPrimary
              ? `Age ${lifeExpectancy}+`
              : `Age ${primary.exhaustionAge}`}
          </p>
          <p className="text-[11px] text-[#6b7280]">
            {horizonPrimary
              ? 'Outlasts life expectancy'
              : `${lifeExpectancy - (primary.exhaustionAge ?? lifeExpectancy)} yr shortfall`}
          </p>
          {secondary && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-black/[0.06] text-[10px]">
              <span className="text-[#9ca3af]">Base case:</span>
              <span className="font-semibold text-[#6b7280]">
                {horizonBase
                  ? `Age ${lifeExpectancy}+ OK`
                  : `Exhausted age ${secondary.exhaustionAge}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Card 3: Terminal Estate Value ────────────────────────── */}
      <div
        className="bg-white rounded-xl border border-black/[0.08] shadow-sm overflow-hidden"
        style={{ borderLeftColor: estatePositive ? ACCENT.purple : ACCENT.red, borderLeftWidth: 3 }}
      >
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#9ca3af]">
                Terminal estate value
              </p>
              {bearCaseEnabled && (
                <span className="text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-px bg-[#FAECE7] text-[#993C1D]">
                  Stressed
                </span>
              )}
            </div>
            {estatePositive ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#EEEDFE] text-[#3C3489]">
                <TrendingUp className="w-3 h-3" /> Growing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-[#FAECE7] text-[#993C1D]">
                <AlertCircle className="w-3 h-3" /> Depleted
              </span>
            )}
          </div>
          <p className="text-[27px] font-semibold text-[#111827] tracking-[-0.02em] leading-none tabular-nums mb-1">
            {estatePositive ? fmt(primary.finalEstateValue) : '—'}
          </p>
          <p className="text-[11px] text-[#6b7280]">Nominal · age {lifeExpectancy}</p>
          {estatePositive && (
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px]">
              <span className="text-[#9ca3af]">Real (today's money):</span>
              <span className="font-semibold tabular-nums" style={{ color: ACCENT.purple }}>
                {fmt(estateRealPrimary)}
              </span>
            </div>
          )}
          {secondary && (
            <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#9ca3af]">Base nominal:</span>
                <span className="font-semibold text-[#6b7280] tabular-nums">
                  {estateBase > 0 ? fmt(estateBase) : '—'}
                </span>
              </div>
              {estateBase > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9ca3af]">Base real:</span>
                  <span className="font-semibold text-[#6b7280] tabular-nums">
                    {fmt(estateRealBase)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
