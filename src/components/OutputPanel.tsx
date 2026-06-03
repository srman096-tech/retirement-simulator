'use client';

import { MasterSimulatorConfig } from '@/types/workspace';
import { SimulationResult } from '@/lib/simulation';
import KPICards        from './KPICards';
import PortfolioChart  from './PortfolioChart';
import ScenarioSliders from './ScenarioSliders';
import DataLedger      from './DataLedger';

interface OutputPanelProps {
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  showDataLedger: boolean;
}

export default function OutputPanel({
  config,
  baseResult,
  crashResult,
  onUpdate,
  showDataLedger,
}: OutputPanelProps) {
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
    </div>
  );
}
