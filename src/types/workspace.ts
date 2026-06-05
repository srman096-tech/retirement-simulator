// ── Currency primitives ───────────────────────────────────────────────────────
export type SupportedCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'SGD';

/** Normalised to 1 USD — updated May 2026 */
export const FX_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  INR: 96.31,
  EUR: 0.90,
  GBP: 0.78,
  AUD: 1.51,
  SGD: 1.34,
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', SGD: 'S$',
};

export const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  INR: '₹  Indian Rupee',
  USD: '$  US Dollar',
  EUR: '€  Euro',
  GBP: '£  British Pound',
  AUD: 'A$ Australian Dollar',
  SGD: 'S$ Singapore Dollar',
};

export interface RegionalDefaults {
  expectedInflation: number;
  equityReturn: number;
  debtReturn: number;
  cashReturn: number;
}

export const REGIONAL_MARKET_MAP: Record<SupportedCurrency, RegionalDefaults> = {
  INR: { expectedInflation: 0.06,  equityReturn: 0.12,  debtReturn: 0.07,  cashReturn: 0.04  },
  USD: { expectedInflation: 0.025, equityReturn: 0.08,  debtReturn: 0.045, cashReturn: 0.02  },
  EUR: { expectedInflation: 0.02,  equityReturn: 0.075, debtReturn: 0.035, cashReturn: 0.015 },
  GBP: { expectedInflation: 0.02,  equityReturn: 0.075, debtReturn: 0.04,  cashReturn: 0.02  },
  AUD: { expectedInflation: 0.028, equityReturn: 0.08,  debtReturn: 0.045, cashReturn: 0.025 },
  SGD: { expectedInflation: 0.02,  equityReturn: 0.07,  debtReturn: 0.03,  cashReturn: 0.015 },
};

// ── Strategy & policy enums ───────────────────────────────────────────────────
export type StrategyType       = '1_BUCKET' | '2_BUCKET' | '3_BUCKET';
export type AssetClass         = 'Equity' | 'Debt' | 'Cash';
export type MilestoneDirection = 'inflow' | 'outflow';
export type IncomeFrequency    = 'one_time' | 'recurring';

// ── Income Streams (accumulation phase) ──────────────────────────────────────
/**
 * Represents a source of income or savings contribution during the accumulation
 * period (before retirement).  Two modes:
 *
 *   'one_time'  — a single lump-sum credit at startYear/startMonth.
 *                 endYear/endMonth are always equal to start.
 *
 *   'recurring' — a fixed monthly contribution active for every month in the
 *                 range [startYear:startMonth .. endYear:endMonth].
 *                 Partial first/last years are automatically pro-rated.
 *
 * All amounts are stored in the nominated `currency`; the simulation converts
 * them to baseCurrency using the effective FX rate.
 *
 * Income is deposited into the highest-growth bucket each year:
 *   3-bucket → B3 (Equity)  |  2-bucket → B2 (Growth)  |  1-bucket → B1
 */
export interface IncomeStream {
  id: string;
  description: string;
  frequency: IncomeFrequency;
  currency: SupportedCurrency;
  /**
   * Monthly contribution amount when frequency = 'recurring'.
   * Total lump-sum amount when frequency = 'one_time'.
   */
  amount: number;
  startMonth: number; // 1–12
  startYear: number;
  /** Always equals startMonth when frequency = 'one_time'. */
  endMonth: number;   // 1–12
  /** Always equals startYear when frequency = 'one_time'. */
  endYear: number;
}

// ── Spending Smile (3-phase parametric model) ─────────────────────────────────
export interface SpendingSmileConfig {
  /** When false, falls back to simple full-CPI compounding */
  isEnabled: boolean;
  /**
   * Phase 1 — Go-Go: enhanced spending above CPI (active early retirement).
   * Annual growth = inflationRate + phase1Premium.  Default: 0.02 (2%)
   */
  phase1Premium: number;
  /**
   * Phase 2 — Slow-Go: spending growth dampened below CPI.
   * Annual growth = max(inflationRate − phase2Contraction, 0.001).  Default: 0.015 (1.5%)
   */
  phase2Contraction: number;
  /**
   * Phase 3 — No-Go: healthcare cost escalation above CPI.
   * Annual growth = inflationRate + phase3Escalator.  Default: 0.03 (3%)
   */
  phase3Escalator: number;
  /** Duration of Phase 1 in years.  Default: 10 */
  phase1Duration: number;
  /** Duration of Phase 2 in years.  Default: 15 */
  phase2Duration: number;
}

// ── Bear market scenario (restored from v1, extended with B2 contagion) ────────
export interface BearMarketScenario {
  id: string;
  label: string;
  /** Client age at which the crash hits */
  crashAge: number;
  /** Equity bucket loss in crash year, e.g. 0.30 = −30 % */
  drawdownPct: number;
  /** Equity bucket return in year +1 after crash */
  recovery1Pct: number;
  /** Equity bucket return in year +2 after crash */
  recovery2Pct: number;
  /**
   * Debt/conservative contagion fraction.
   * Effective B2 drop = drawdownPct × bucket2ContagionPct
   *   0.00 = fully insulated (pure T-bills / liquid funds)
   *   0.20 = realistic diversified debt portfolio
   *   0.40 = high contagion (long-duration bonds, credit crisis)
   * B2 recovers at its normal debtReturnRate from year +1 onward.
   */
  bucket2ContagionPct: number;
  enabled: boolean;
}

// ── Data rows ─────────────────────────────────────────────────────────────────
export interface MultiCurrencyAsset {
  id: string;
  assetClass: AssetClass;
  displayName: string;
  currency: SupportedCurrency;
  currentValue: number; // stored in native currency
}

export interface MultiCurrencyMilestone {
  id: string;
  description: string;
  targetAge: number;
  currency: SupportedCurrency;
  amountRequired: number; // stored in native currency
  direction: MilestoneDirection;
}

// ── Master configuration ──────────────────────────────────────────────────────
export interface MasterSimulatorConfig {
  // Client / advisor branding
  clientName: string;
  advisorName: string;   // individual advisor / relationship manager
  advisorFirmName: string;
  themePrimaryColor: string;

  // Demographics
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;

  // Currency & strategy
  baseCurrency: SupportedCurrency;
  strategy: StrategyType;

  // Expenses
  monthlyExpensesNative: number; // in baseCurrency
  spendingSmile: SpendingSmileConfig;
  inflationRate: number;

  // Return rates (user-editable, seeded from regional defaults on currency change)
  cashReturnRate: number;
  debtReturnRate: number;
  equityReturnRate: number;

  // Bucket replenishment targets (in years of annual expense)
  bucket1TargetYears: number; // 2-bucket and 3-bucket
  bucket2TargetYears: number; // 3-bucket only

  // Bear market scenarios (multiple configurable events)
  bearCaseEnabled: boolean;
  bearMarketScenarios: BearMarketScenario[];

  /**
   * User-editable FX overrides: "1 unit of this currency = X units of base currency".
   * Keys are the foreign currency; omitting a key falls back to FX_RATES defaults.
   * Must be reset to {} whenever baseCurrency changes.
   */
  fxOverrides: Partial<Record<SupportedCurrency, number>>;

  assets: MultiCurrencyAsset[];
  milestones: MultiCurrencyMilestone[];
  /** Income / savings contributions during the accumulation phase. */
  incomeStreams: IncomeStream[];
}

// ── FX utilities ──────────────────────────────────────────────────────────────

/**
 * Simple FX conversion using the global rate table.
 * FX_RATES are "units per 1 USD", so to convert:
 *   amount_to = amount_from × (FX_RATES[to] / FX_RATES[from])
 * e.g. 1 USD → INR: 1 × (96.31 / 1.0) = 96.31 ✓
 *      100 INR → USD: 100 × (1.0 / 96.31) = 1.038 ✓
 */
export function fxConvert(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
): number {
  if (from === to) return amount;
  return amount * (FX_RATES[to] / FX_RATES[from]);
}

/**
 * Returns the effective rate: "1 unit of `foreign` = X units of `base`".
 * Uses user override when present, otherwise derives from FX_RATES table.
 */
export function getEffectiveRate(
  foreign: SupportedCurrency,
  base: SupportedCurrency,
  overrides: Partial<Record<SupportedCurrency, number>>,
): number {
  if (foreign === base) return 1;
  if (overrides[foreign] !== undefined) return overrides[foreign]!;
  // Default: FX_RATES stores "units per 1 USD"
  // 1 unit of `foreign` = FX_RATES[base] / FX_RATES[foreign] units of `base`
  return FX_RATES[base] / FX_RATES[foreign];
}

/**
 * FX conversion with user-editable rate overrides.
 * Overrides are stored as "1 foreign = X base_currency units".
 */
export function fxConvertWithOverrides(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  overrides: Partial<Record<SupportedCurrency, number>>,
  base: SupportedCurrency,
): number {
  if (from === to) return amount;
  const fromToBase = getEffectiveRate(from, base, overrides);
  const toToBase   = getEffectiveRate(to,   base, overrides);
  return amount * fromToBase / toToBase;
}

// ── Default state (INR / 3-bucket) ────────────────────────────────────────────
export const initialConfig: MasterSimulatorConfig = {
  clientName:        'Client Name',
  advisorName:       'Advisor Name',
  advisorFirmName:   'Your Advisory Firm',
  themePrimaryColor: '#1D9E75',

  currentAge:     55,
  retirementAge:  60,
  lifeExpectancy: 85,

  baseCurrency: 'INR',
  strategy:     '3_BUCKET',

  monthlyExpensesNative: 150_000,
  spendingSmile: {
    isEnabled:         false,
    phase1Premium:     0.02,
    phase2Contraction: 0.015,
    phase3Escalator:   0.03,
    phase1Duration:    10,
    phase2Duration:    15,
  },
  inflationRate: 0.06,

  cashReturnRate:   0.04,
  debtReturnRate:   0.07,
  equityReturnRate: 0.12,

  bucket1TargetYears: 1.5,
  bucket2TargetYears: 5,

  bearCaseEnabled: false,
  fxOverrides: {},
  bearMarketScenarios: [
    {
      id: 'bear1', label: 'Early-Retirement Shock',
      crashAge: 62, drawdownPct: 0.30,
      recovery1Pct: 0.12, recovery2Pct: 0.10,
      bucket2ContagionPct: 0.20, enabled: true,
    },
    {
      id: 'bear2', label: 'Mid-Retirement Correction',
      crashAge: 70, drawdownPct: 0.35,
      recovery1Pct: 0.15, recovery2Pct: 0.10,
      bucket2ContagionPct: 0.25, enabled: true,
    },
  ],

  assets: [
    { id: 'a1', assetClass: 'Equity', displayName: 'Equity Mutual Funds',      currency: 'INR', currentValue: 10_000_000 },
    { id: 'a2', assetClass: 'Debt',   displayName: 'Fixed Deposits & Bonds',   currency: 'INR', currentValue:  5_000_000 },
    { id: 'a3', assetClass: 'Cash',   displayName: 'Liquid / Savings Account', currency: 'INR', currentValue:  1_000_000 },
  ],

  milestones: [
    { id: 'm1', description: 'Capital Event (Outflow)', targetAge: 58, currency: 'INR', amountRequired: 2_000_000, direction: 'outflow' },
    { id: 'm2', description: 'Pension / Inflow',        targetAge: 60, currency: 'INR', amountRequired: 2_000_000, direction: 'inflow'  },
  ],

  incomeStreams: [],
};
