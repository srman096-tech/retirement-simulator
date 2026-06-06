'use client';

import { MasterSimulatorConfig } from '@/types/workspace';
import { SimulationResult } from '@/lib/simulation';
import KPICards                 from './KPICards';
import PortfolioChart           from './PortfolioChart';
import ScenarioSliders          from './ScenarioSliders';
import DataLedger               from './DataLedger';
import StrategyComparisonPanel  from './StrategyComparisonPanel';

interface OutputPanelProps {
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  showDataLedger: boolean;
  // Compare-strategies parallel results (null when feature is off)
  compare1B: SimulationResult | null;
  compare2B: SimulationResult | null;
  compare3B: SimulationResult | null;
}

export default function OutputPanel({
  config,
  baseResult,
  crashResult,
  onUpdate,
  showDataLedger,
  compare1B,
  compare2B,
  compare3B,
}: OutputPanelProps) {
  const showComparison = config.compareStrategies && compare1B && compare2B && compare3B;

  return (
    <div className="space-y-5">

      {/* KPI cards — always visible */}
      <KPICards config={config} baseResult={baseResult} crashResult={crashResult} />

      {showDataLedger ? (
        /* ── Data Ledger view ─────────────────────────────────────────── */
        <DataLedger
          config={config}
          baseDataPoints={baseResult.dataPoints}
          crashDataPoints={crashResult.dataPoints}
        />
      ) : (
        /* ── Chart + What-if sliders view ────────────────────────────── */
        <>
          <PortfolioChart
            config={config}
            baseDataPoints={baseResult.dataPoints}
            crashDataPoints={crashResult.dataPoints}
          />
          <ScenarioSliders
            config={config}
            onUpdate={onUpdate}
            themePrimaryColor={config.themePrimaryColor}
          />
        </>
      )}

      {/* ── Strategy Comparison panel ────────────────────────────────── */}
      {showComparison && (
        <StrategyComparisonPanel
          config={config}
          result1B={compare1B}
          result2B={compare2B}
          result3B={compare3B}
        />
      )}
    </div>
  );
}
