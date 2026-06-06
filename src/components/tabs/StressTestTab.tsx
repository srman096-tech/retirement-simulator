'use client';

import { MasterSimulatorConfig, BearMarketScenario } from '@/types/workspace';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TrendingDown, ToggleLeft, ToggleRight, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  themePrimaryColor: string;
}

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? (v as readonly number[])[0] : (v as number);
}

function pct(v: number, decimals = 0) { return `${(v * 100).toFixed(decimals)}%`; }

const SCENARIO_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7'];

// ── Scenario card ─────────────────────────────────────────────────────────────
function ScenarioCard({
  scenario,
  index,
  canDelete,
  currentAge,
  minAge,
  maxAge,
  color,
  themePrimaryColor,
  onChange,
  onDelete,
}: {
  scenario: BearMarketScenario;
  index: number;
  canDelete: boolean;
  currentAge: number;
  minAge: number;
  maxAge: number;
  color: string;
  themePrimaryColor: string;
  onChange: (updated: BearMarketScenario) => void;
  onDelete: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const up = (partial: Partial<BearMarketScenario>) => onChange({ ...scenario, ...partial });

  const b2Impact = -(scenario.drawdownPct * scenario.bucket2ContagionPct);

  return (
    <div
      className="rounded-xl border-2 overflow-hidden transition-all"
      style={{
        borderColor: scenario.enabled ? `${color}60` : '#e2e8f0',
        backgroundColor: scenario.enabled ? `${color}05` : '#fafafa',
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: scenario.enabled ? color : '#cbd5e1' }}
        />

        {/* Label input */}
        <input
          value={scenario.label}
          onChange={e => up({ label: e.target.value })}
          className="flex-1 text-xs font-semibold bg-transparent outline-none text-slate-800 placeholder:text-slate-400 min-w-0"
          placeholder="Scenario name…"
        />

        {/* Per-scenario active toggle */}
        <button
          onClick={() => up({ enabled: !scenario.enabled })}
          className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 transition-colors"
          style={
            scenario.enabled
              ? { backgroundColor: color, color: '#fff' }
              : { backgroundColor: '#f1f5f9', color: '#94a3b8' }
          }
        >
          {scenario.enabled ? 'ON' : 'OFF'}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>

        {/* Delete */}
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
            title="Remove scenario"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sliders */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100">

          {/* Crash trigger age */}
          <div className="pt-3">
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] text-slate-500">Crash Trigger Age</Label>
              <span className="text-xs font-bold text-slate-800">Age {scenario.crashAge}</span>
            </div>
            <Slider
              value={[scenario.crashAge]}
              min={minAge} max={maxAge} step={1}
              onValueChange={v => up({ crashAge: sliderVal(v) })}
              className="w-full"
            />
          </div>

          {/* Equity drawdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] text-slate-500">Equity Drawdown</Label>
              <span className="text-xs font-bold text-red-600">−{pct(scenario.drawdownPct)}</span>
            </div>
            <Slider
              value={[scenario.drawdownPct * 100]}
              min={5} max={80} step={1}
              onValueChange={v => up({ drawdownPct: sliderVal(v) / 100 })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>−5% mild</span><span>−80% severe</span>
            </div>
          </div>

          {/* B2 debt contagion */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] text-slate-500">B2 Debt Contagion</Label>
              <span className="text-xs font-bold" style={{ color }}>
                {pct(scenario.bucket2ContagionPct)} → B2 = {pct(b2Impact, 1)}
              </span>
            </div>
            <Slider
              value={[scenario.bucket2ContagionPct * 100]}
              min={0} max={50} step={1}
              onValueChange={v => up({ bucket2ContagionPct: sliderVal(v) / 100 })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0% insulated</span><span>50% high contagion</span>
            </div>
          </div>

          {/* Recovery Year 1 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] text-slate-500">Recovery Year 1</Label>
              <span className="text-xs font-bold text-green-600">+{pct(scenario.recovery1Pct)}</span>
            </div>
            <Slider
              value={[scenario.recovery1Pct * 100]}
              min={0} max={50} step={1}
              onValueChange={v => up({ recovery1Pct: sliderVal(v) / 100 })}
              className="w-full"
            />
          </div>

          {/* Recovery Year 2 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] text-slate-500">Recovery Year 2</Label>
              <span className="text-xs font-bold text-green-600">+{pct(scenario.recovery2Pct)}</span>
            </div>
            <Slider
              value={[scenario.recovery2Pct * 100]}
              min={0} max={50} step={1}
              onValueChange={v => up({ recovery2Pct: sliderVal(v) / 100 })}
              className="w-full"
            />
          </div>

          {/* Summary line */}
          <div
            className="rounded-lg px-3 py-2 text-[10px] leading-relaxed mt-1"
            style={{ backgroundColor: `${color}10`, color, borderLeft: `3px solid ${color}` }}
          >
            B3 drops <strong>−{pct(scenario.drawdownPct)}</strong> at age {scenario.crashAge}
            {scenario.bucket2ContagionPct > 0 && (
              <> · B2 contagion <strong>{pct(b2Impact, 1)}</strong></>
            )}
            {' '}· recovers <strong>+{pct(scenario.recovery1Pct)}</strong> / <strong>+{pct(scenario.recovery2Pct)}</strong>
          </div>

          {/* Stale crash-age warning */}
          {scenario.crashAge <= currentAge && (
            <div className="flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 bg-amber-50 border border-amber-300 mt-1">
              <div className="flex items-start gap-1.5 text-[10px] text-amber-800 leading-snug">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
                <span>
                  Crash age <strong>{scenario.crashAge}</strong> is at or before current age <strong>{currentAge}</strong>.
                  The simulation starts at age {currentAge}, so this crash never fires —{' '}
                  <strong>stressed and base results will be identical.</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => up({ crashAge: minAge })}
                className="shrink-0 text-[10px] font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded px-2 py-1 transition-colors whitespace-nowrap"
              >
                Fix → Age {minAge}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StressTestTab({ config, onUpdate, themePrimaryColor }: Props) {
  const {
    bearCaseEnabled, bearMarketScenarios, currentAge, lifeExpectancy,
    enableDownturnHaircut, downturnExpenseCutPercent,
  } = config;

  const updateScenario = (id: string, updated: BearMarketScenario) => {
    onUpdate({
      bearMarketScenarios: bearMarketScenarios.map(s => s.id === id ? updated : s),
    });
  };

  const deleteScenario = (id: string) => {
    onUpdate({ bearMarketScenarios: bearMarketScenarios.filter(s => s.id !== id) });
  };

  const addScenario = () => {
    if (bearMarketScenarios.length >= 4) return;
    const existingAges = bearMarketScenarios.map(s => s.crashAge);
    // Pick a default age that doesn't collide
    const defaultAge = [60, 65, 70, 75].find(a => !existingAges.includes(a)) ?? 62;
    const newScenario: BearMarketScenario = {
      id: `bear-${Date.now()}`,
      label: `Scenario ${bearMarketScenarios.length + 1}`,
      crashAge: defaultAge,
      drawdownPct: 0.30,
      recovery1Pct: 0.12,
      recovery2Pct: 0.10,
      bucket2ContagionPct: 0.20,
      enabled: true,
    };
    onUpdate({ bearMarketScenarios: [...bearMarketScenarios, newScenario] });
  };

  const activeCount    = bearMarketScenarios.filter(s => s.enabled).length;
  const staleCount     = bearMarketScenarios.filter(s => s.enabled && s.crashAge <= currentAge).length;
  const allStale       = activeCount > 0 && staleCount === activeCount;

  return (
    <div className="pt-4 space-y-4">

      {/* ── Master toggle card ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Multi-Scenario Stress Test</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Configure up to 4 independent bear market events with equity drawdown,
                B2 contagion, and staged recovery. Base case projection stays visible as a dashed reference.
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdate({ bearCaseEnabled: !bearCaseEnabled })}
            className="shrink-0 flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors"
            style={
              bearCaseEnabled
                ? { backgroundColor: themePrimaryColor, color: '#fff' }
                : { backgroundColor: '#f1f5f9', color: '#64748b' }
            }
          >
            {bearCaseEnabled
              ? <><ToggleRight className="w-4 h-4" /> ON</>
              : <><ToggleLeft className="w-4 h-4" /> OFF</>}
          </button>
        </div>

        {bearCaseEnabled && activeCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-slate-200 text-[11px] text-slate-500">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-white text-[10px]"
              style={{ backgroundColor: themePrimaryColor }}
            >
              {activeCount} active
            </span>
            scenario{activeCount !== 1 ? 's' : ''} will be overlaid on the chart and KPIs.
          </div>
        )}

        {!bearCaseEnabled && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Stress test is <strong>disabled</strong>. Toggle ON to overlay crash scenarios.
          </p>
        )}

        {/* Global stale-scenario warning */}
        {bearCaseEnabled && allStale && (
          <div className="flex items-start justify-between gap-3 mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
            <div className="flex items-start gap-2 text-[11px] text-red-700 leading-snug">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-red-500" />
              <span>
                <strong>All {staleCount} active scenario{staleCount !== 1 ? 's' : ''} have crash ages before or at
                current age {currentAge}.</strong>{' '}
                The simulation ignores past crashes — stressed and base results are currently identical.
                Click "Fix All" to move scenarios into the future.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const fixed = bearMarketScenarios.map((s, i) => ({
                  ...s,
                  crashAge: s.crashAge <= currentAge
                    ? Math.min(currentAge + 2 + i * 5, lifeExpectancy - 3)
                    : s.crashAge,
                }));
                onUpdate({ bearMarketScenarios: fixed });
              }}
              className="shrink-0 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Fix All
            </button>
          </div>
        )}
      </div>

      {/* ── Scenario cards ─────────────────────────────────────────────── */}
      <div
        className={`space-y-3 transition-opacity duration-200 ${
          bearCaseEnabled ? 'opacity-100' : 'opacity-35 pointer-events-none'
        }`}
      >
        {bearMarketScenarios.map((s, i) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            index={i}
            canDelete={bearMarketScenarios.length > 1}
            currentAge={currentAge}
            minAge={currentAge + 1}
            maxAge={lifeExpectancy - 3}
            color={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
            themePrimaryColor={themePrimaryColor}
            onChange={updated => updateScenario(s.id, updated)}
            onDelete={() => deleteScenario(s.id)}
          />
        ))}

        {/* Add scenario */}
        {bearMarketScenarios.length < 4 && (
          <button
            onClick={addScenario}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-xs text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add scenario ({bearMarketScenarios.length}/4)
          </button>
        )}
      </div>

      {/* ── Dynamic Guardrails ─────────────────────────────────────── */}
      <div
        className={`rounded-xl border-2 overflow-hidden transition-all ${
          bearCaseEnabled ? 'opacity-100' : 'opacity-35 pointer-events-none'
        }`}
        style={{
          borderColor: config.enableDownturnHaircut ? '#2563eb60' : '#e2e8f0',
          backgroundColor: config.enableDownturnHaircut ? '#eff6ff' : '#fafafa',
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">🛡️</span>
            <div>
              <p className="text-[12px] font-semibold text-slate-800 leading-snug">
                Dynamic Guardrails
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Flexible Spending (Downturn Haircut)
              </p>
            </div>
          </div>
          {/* Toggle */}
          <button
            type="button"
            onClick={() => onUpdate({ enableDownturnHaircut: !config.enableDownturnHaircut })}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 transition-colors"
            style={
              config.enableDownturnHaircut
                ? { backgroundColor: '#2563eb', color: '#fff' }
                : { backgroundColor: '#f1f5f9', color: '#64748b' }
            }
          >
            {config.enableDownturnHaircut ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Slider — only active when enabled */}
        <div
          className="px-4 pb-4 space-y-2 border-t border-slate-100"
          style={{ opacity: config.enableDownturnHaircut ? 1 : 0.4, pointerEvents: config.enableDownturnHaircut ? 'auto' : 'none' }}
        >
          <div className="flex items-center justify-between pt-3 mb-1">
            <Label className="text-[11px] text-slate-500">Downturn Spending Haircut</Label>
            <span className="text-sm font-bold text-blue-700">
              −{pct(config.downturnExpenseCutPercent ?? 0.10)}
            </span>
          </div>
          <Slider
            value={[(config.downturnExpenseCutPercent ?? 0.10) * 100]}
            min={5} max={25} step={5}
            onValueChange={v => onUpdate({ downturnExpenseCutPercent: sliderVal(v) / 100 })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>−5% mild</span><span>−25% aggressive</span>
          </div>

          {/* Explanation */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 mt-2 text-[10px] text-blue-700 leading-[1.55]">
            During each crash year, living expenses are automatically reduced by{' '}
            <strong>{pct(config.downturnExpenseCutPercent ?? 0.10)}</strong> before the bucket
            drawdown sequence runs. This simulates cutting non-essential discretionary spending
            while asset values are depressed, protecting capital from sequence-of-returns risk.
          </div>
        </div>
      </div>

      {/* ── Methodology note ─────────────────────────────────────────── */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5 text-[10px] text-slate-500 leading-relaxed">
        <strong className="text-slate-600">Methodology:</strong> In each crash year, the equity bucket
        loses the drawdown %, and the debt bucket loses drawdown × contagion fraction.
        In years +1 and +2, equity recovers at the specified rates. All other buckets use normal return rates.
        Scenarios are independent and can overlap — the highest-priority (first-listed) crash rule applies when ages coincide.
        {config.enableDownturnHaircut && bearCaseEnabled && (
          <span className="text-blue-600">
            {' '}Dynamic Guardrails are active: living expenses reduced by {pct(config.downturnExpenseCutPercent ?? 0.10)} in crash years.
          </span>
        )}
      </div>
    </div>
  );
}
