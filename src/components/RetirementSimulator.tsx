'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MasterSimulatorConfig,
  SupportedCurrency,
  initialConfig,
  REGIONAL_MARKET_MAP,
  fxConvertWithOverrides,
} from '@/types/workspace';
import { executeSimulation } from '@/lib/simulation';
import { saveSimulationState, loadSimulationState, purgeLocalData } from '@/lib/secureStorage';
import Navbar               from './Navbar';
import InputPanel           from './InputPanel';
import OutputPanel          from './OutputPanel';
import DisclaimerFooter     from './DisclaimerFooter';
import CookieConsentBanner  from './CookieConsentBanner';

export type FxStatus = 'loading' | 'live' | 'offline';

const ALL_CURRENCIES: SupportedCurrency[] = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'SGD'];

/** Derive fxOverrides ("1 foreign = X base") from a USD-normalised rate map. */
function computeOverridesForBase(
  base: SupportedCurrency,
  usdRates: Record<string, number>,
): Partial<Record<SupportedCurrency, number>> {
  const basePerUsd = usdRates[base] ?? 1;          // e.g. INR → 84.5
  const overrides: Partial<Record<SupportedCurrency, number>> = {};
  for (const c of ALL_CURRENCIES) {
    if (c !== base && usdRates[c] !== undefined) {
      // 1 foreign = (basePerUsd / foreignPerUsd) base units
      overrides[c] = basePerUsd / usdRates[c];
    }
  }
  return overrides;
}

export default function RetirementSimulator() {
  const [config, setConfig]                 = useState<MasterSimulatorConfig>(initialConfig);
  const [showDataLedger, setShowDataLedger] = useState(false);

  // ── Session restore / auto-save ────────────────────────────────────────────
  // `sessionLoaded` prevents auto-save from firing with initialConfig before
  // the vault has been read (avoids overwriting a valid saved session).
  const sessionLoaded = useRef(false);

  // Load once on client mount — safe from SSR hydration mismatch
  useEffect(() => {
    const saved = loadSimulationState();
    if (saved) {
      try {
        setConfig(saved as MasterSimulatorConfig);
      } catch {
        // corrupted shape — ignore and use initialConfig
      }
    }
    sessionLoaded.current = true;
  }, []);

  // Auto-save (debounced 600ms) whenever config changes after initial load
  useEffect(() => {
    if (!sessionLoaded.current) return;
    const t = setTimeout(() => saveSimulationState(config), 600);
    return () => clearTimeout(t);
  }, [config]);

  // Purge handler — wipes localStorage, resets UI state
  const handlePurgeSession = useCallback(() => {
    purgeLocalData();
    setConfig(initialConfig);
  }, []);

  // ── Live FX state ──────────────────────────────────────────────────────────
  const [liveUsdRates, setLiveUsdRates]   = useState<Record<string, number> | null>(null);
  const [fxStatus, setFxStatus]           = useState<FxStatus>('loading');
  const [fxLastUpdated, setFxLastUpdated] = useState<string | null>(null);

  const fetchLiveRates = useCallback(async () => {
    setFxStatus('loading');
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=USD');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // data.rates = { INR: 84.5, EUR: 0.90, GBP: 0.78, AUD: 1.51, SGD: 1.34 }
      const usdRates: Record<string, number> = { USD: 1.0, ...data.rates };
      setLiveUsdRates(usdRates);
      // Seed fxOverrides with live rates relative to current base
      setConfig(prev => ({
        ...prev,
        fxOverrides: computeOverridesForBase(prev.baseCurrency, usdRates),
      }));
      setFxStatus('live');
      setFxLastUpdated(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (err) {
      console.warn('[FX] Live rate fetch failed — using built-in fallback rates.', err);
      setFxStatus('offline');
    }
  }, []);

  // Fetch once on mount
  useEffect(() => {
    fetchLiveRates();
  }, [fetchLiveRates]);

  // ── Simulations ────────────────────────────────────────────────────────────
  const baseResult = useMemo(
    () => executeSimulation({ ...config, bearCaseEnabled: false }),
    [config],
  );
  const crashResult = useMemo(
    () => executeSimulation(config),
    [config],
  );

  // ── Compare Strategies — parallel base-case runs for all 3 strategies ──────
  // Always base-case (bearCaseEnabled: false) for apples-to-apples comparison.
  const compare1B = useMemo(
    () => config.compareStrategies
      ? executeSimulation({ ...config, strategy: '1_BUCKET', bearCaseEnabled: false })
      : null,
    [config],
  );
  const compare2B = useMemo(
    () => config.compareStrategies
      ? executeSimulation({ ...config, strategy: '2_BUCKET', bearCaseEnabled: false })
      : null,
    [config],
  );
  const compare3B = useMemo(
    () => config.compareStrategies
      ? executeSimulation({ ...config, strategy: '3_BUCKET', bearCaseEnabled: false })
      : null,
    [config],
  );

  // ── Config update with FX re-apply on currency change ─────────────────────
  const onUpdate = useCallback((updates: Partial<MasterSimulatorConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...updates };

      // When the base currency changes:
      // 1. Re-seed FX overrides for the new base
      // 2. Apply regional market defaults
      // 3. Convert monthlyExpensesNative to the new base currency
      if (updates.baseCurrency && updates.baseCurrency !== prev.baseCurrency) {
        const newBase = updates.baseCurrency;
        const oldBase = prev.baseCurrency;
        const d = REGIONAL_MARKET_MAP[newBase];

        // Compute the FX overrides for the old base so we can convert expenses
        const oldOverrides = liveUsdRates
          ? computeOverridesForBase(oldBase, liveUsdRates)
          : prev.fxOverrides ?? {};

        // Convert monthly expenses from old base → new base
        next.monthlyExpensesNative = fxConvertWithOverrides(
          prev.monthlyExpensesNative,
          oldBase,
          newBase,
          oldOverrides,
          oldBase,
        );

        // Regional market defaults
        next.inflationRate    = updates.inflationRate    ?? d.expectedInflation;
        next.equityReturnRate = updates.equityReturnRate ?? d.equityReturn;
        next.debtReturnRate   = updates.debtReturnRate   ?? d.debtReturn;
        next.cashReturnRate   = updates.cashReturnRate   ?? d.cashReturn;

        // FX overrides for the new base
        next.fxOverrides = liveUsdRates
          ? computeOverridesForBase(newBase, liveUsdRates)
          : {};
      }

      return next;
    });
  }, [liveUsdRates]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f0f2f5]"
      style={{ '--theme-primary': config.themePrimaryColor } as React.CSSProperties}
    >
      <Navbar
        advisorFirmName={config.advisorFirmName}
        advisorName={config.advisorName}
        themePrimaryColor={config.themePrimaryColor}
        clientName={config.clientName}
        currentAge={config.currentAge}
        baseCurrency={config.baseCurrency}
        showDataLedger={showDataLedger}
        onDataLedgerToggle={() => setShowDataLedger(v => !v)}
        onAdvisorFirmNameChange={(name) => onUpdate({ advisorFirmName: name })}
        onAdvisorNameChange={(name) => onUpdate({ advisorName: name })}
        onThemePrimaryColorChange={(color) => onUpdate({ themePrimaryColor: color })}
        config={config}
        baseResult={baseResult}
        crashResult={crashResult}
      />

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-[360px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-black/[0.08] overflow-y-auto lg:h-[calc(100vh-52px)]">
          <InputPanel
            config={config}
            onUpdate={onUpdate}
            fxStatus={fxStatus}
            fxLastUpdated={fxLastUpdated}
            onRefreshFx={fetchLiveRates}
            onPurgeSession={handlePurgeSession}
            onLoadDataset={(loaded) => setConfig(loaded)}
          />
        </aside>
        <section className="flex-1 min-w-0 p-5 md:p-5 overflow-y-auto lg:h-[calc(100vh-52px)]">
          <OutputPanel
            config={config}
            baseResult={baseResult}
            crashResult={crashResult}
            onUpdate={onUpdate}
            showDataLedger={showDataLedger}
            compare1B={compare1B}
            compare2B={compare2B}
            compare3B={compare3B}
          />
        </section>
      </main>

      <DisclaimerFooter />
      <CookieConsentBanner />
    </div>
  );
}
