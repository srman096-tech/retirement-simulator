'use client';

import { useState } from 'react';
import { MasterSimulatorConfig } from '@/types/workspace';
import CoreMetricsTab from './tabs/CoreMetricsTab';
import AssetsTab      from './tabs/AssetsTab';
import MilestonesTab  from './tabs/MilestonesTab';
import StressTestTab  from './tabs/StressTestTab';
import GDPRControls   from './GDPRControls';

export type FxStatus = 'loading' | 'live' | 'offline';

interface InputPanelProps {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  fxStatus: FxStatus;
  fxLastUpdated: string | null;
  onRefreshFx: () => Promise<void>;
  onPurgeSession: () => void;
  onLoadDataset: (config: MasterSimulatorConfig) => void;
}

type TabId = 'core' | 'assets' | 'milestones' | 'stress';

const TABS: { id: TabId; label: string }[] = [
  { id: 'core',       label: 'Core'   },
  { id: 'assets',     label: 'Assets' },
  { id: 'milestones', label: 'Events' },
  { id: 'stress',     label: 'Stress' },
];

export default function InputPanel({ config, onUpdate, fxStatus, fxLastUpdated, onRefreshFx, onPurgeSession, onLoadDataset }: InputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const primaryColor = config.themePrimaryColor;

  return (
    <div className="h-full flex flex-col">

      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div className="flex border-b border-black/[0.08] shrink-0 px-1">
        {TABS.map(tab => {
          const active  = activeTab === tab.id;
          const isStress = tab.id === 'stress';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 py-3 text-[12px] font-medium transition-colors whitespace-nowrap"
              style={{
                color: active ? primaryColor : '#6b7280',
                borderBottom: active ? `2px solid ${primaryColor}` : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {tab.label}
              {isStress && config.bearCaseEnabled && (
                <span className="inline-flex items-center gap-0.5 bg-[#FAECE7] text-[#993C1D] rounded-full px-1.5 py-px text-[9px] font-semibold ml-1.5 align-middle">
                  <span className="w-1 h-1 rounded-full bg-[#D85A30] shrink-0" />
                  on
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'core' && (
          <CoreMetricsTab
            config={config}
            onUpdate={onUpdate}
            fxStatus={fxStatus}
            fxLastUpdated={fxLastUpdated}
            onRefreshFx={onRefreshFx}
          />
        )}
        {activeTab === 'assets' && (
          <AssetsTab config={config} onUpdate={onUpdate} themePrimaryColor={primaryColor} />
        )}
        {activeTab === 'milestones' && (
          <MilestonesTab config={config} onUpdate={onUpdate} themePrimaryColor={primaryColor} />
        )}
        {activeTab === 'stress' && (
          <StressTestTab config={config} onUpdate={onUpdate} themePrimaryColor={primaryColor} />
        )}
      </div>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-black/[0.06] bg-[#f6f7f9] shrink-0">
        <p className="text-[10px] text-[#9ca3af] leading-[1.55]">
          Hypothetical projections only. Not financial or investment advice. All figures are
          illustrative and based on user-configured assumptions.
        </p>
      </div>

      {/* ── GDPR Controls ────────────────────────────────────────────── */}
      <GDPRControls config={config} onPurge={onPurgeSession} onLoadDataset={onLoadDataset} />

    </div>
  );
}
