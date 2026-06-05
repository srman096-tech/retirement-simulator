import {
  MasterSimulatorConfig,
  StrategyType,
  SupportedCurrency,
  fxConvertWithOverrides,
} from '@/types/workspace';

// ── Output types ───────────────────────────────────────────────────────────
export type MarketStatus = 'ACCUMULATION' | 'CRASH' | 'RECOVERY' | 'GROWTH';

export interface SimulationDataPoint {
  age: number;
  calendarYear: number;
  /**
   * bucket1 — Cash (3-bucket) | Safety/Cash+Debt (2-bucket) | Entire portfolio (1-bucket)
   * bucket2 — Debt (3-bucket) | Growth/Equity (2-bucket)    | 0 (1-bucket)
   * bucket3 — Equity (3-bucket)                              | 0 (1/2-bucket)
   */
  bucket1: number;
  bucket2: number;
  bucket3: number;
  total: number;
  /** Portfolio total deflated to today's purchasing power (÷ cumulative CPI) */
  realTotal: number;
  annualExpense: number;
  annualOutflow: number; // milestone outflows only (not living expenses)
  annualInflow: number;
  refillB1FromB2: number;
  refillB2FromB3: number;
  equityEffectiveRate: number;
  debtEffectiveRate: number;
  effectiveInflationRate: number;
  isInCrashWindow: boolean; // true when marketStatus === 'CRASH'
  marketStatus: MarketStatus;
}

export interface SimulationResult {
  dataPoints: SimulationDataPoint[];
  exhaustionAge: number | null;
  finalEstateValue: number;
  /** Terminal estate value deflated to today's purchasing power */
  finalEstateValueReal: number;
  isFunded: boolean;
}

// ── Bear market helpers ─────────────────────────────────────────────────────

/**
 * Effective equity return for a given age under multi-scenario bear case.
 * Crash year  → −drawdownPct
 * Year +1     → recovery1Pct
 * Year +2     → recovery2Pct
 * Otherwise   → equityReturnRate
 */
function getBearEquityRate(age: number, cfg: MasterSimulatorConfig): number {
  if (!cfg.bearCaseEnabled) return cfg.equityReturnRate;
  for (const s of cfg.bearMarketScenarios) {
    if (!s.enabled) continue;
    if (age === s.crashAge)     return -s.drawdownPct;
    if (age === s.crashAge + 1) return s.recovery1Pct;
    if (age === s.crashAge + 2) return s.recovery2Pct;
  }
  return cfg.equityReturnRate;
}

/**
 * Effective Debt (B2) return for a given age.
 * In crash year: −(drawdownPct × bucket2ContagionPct)
 * All other years: debtReturnRate
 */
function getBearDebtRate(age: number, cfg: MasterSimulatorConfig): number {
  if (!cfg.bearCaseEnabled) return cfg.debtReturnRate;
  for (const s of cfg.bearMarketScenarios) {
    if (!s.enabled) continue;
    if (age === s.crashAge) return -(s.drawdownPct * s.bucket2ContagionPct);
  }
  return cfg.debtReturnRate;
}

/** Market status label for a given age. */
function getMarketStatus(
  age: number,
  cfg: MasterSimulatorConfig,
  retirementAge: number,
): MarketStatus {
  if (age < retirementAge) return 'ACCUMULATION';
  if (!cfg.bearCaseEnabled) return 'GROWTH';
  for (const s of cfg.bearMarketScenarios) {
    if (!s.enabled) continue;
    if (age === s.crashAge)     return 'CRASH';
    if (age === s.crashAge + 1) return 'RECOVERY';
    if (age === s.crashAge + 2) return 'RECOVERY';
  }
  return 'GROWTH';
}

// ── Expense helpers ──────────────────────────────────────────────────────────

/**
 * Compute the spending-smile annual expense `t` years into retirement.
 * `t = 0` = first year of retirement.
 *
 * When smile.isEnabled:
 *   Phase 1 (Go-Go,   t < p1Dur):           L × (1+I+P1)^(t+1)
 *   Phase 2 (Slow-Go, t < p1Dur+p2Dur):     P1_peak × (1+max(I−P2,0.001))^(t−p1Dur+1)
 *   Phase 3 (No-Go,   t ≥ p1Dur+p2Dur):     P2_end  × (1+I+P3)^(t−p1Dur−p2Dur+1)
 *
 * Where L = monthly_native × 12 × (1+I)^(retirementAge − currentAge)
 *   (nominal expenses at the moment of retirement)
 *
 * When disabled → simple FULL_CPI: monthly_native × 12 × (1+I)^(age − currentAge)
 */
export function computeSmileExpenseAtT(
  t: number,
  L_retirementAnnual: number,
  inflationRate: number,
  phase1Premium: number,
  phase2Contraction: number,
  phase3Escalator: number,
  phase1Duration: number,
  phase2Duration: number,
): number {
  const { p1Peak, r2, p2End } = smilePeaks(
    L_retirementAnnual, inflationRate, phase1Premium, phase2Contraction, phase1Duration, phase2Duration,
  );

  if (t < phase1Duration) {
    return L_retirementAnnual * Math.pow(1 + inflationRate + phase1Premium, t + 1);
  }
  if (t < phase1Duration + phase2Duration) {
    return p1Peak * Math.pow(1 + r2, t - phase1Duration + 1);
  }
  return p2End * Math.pow(1 + inflationRate + phase3Escalator, t - phase1Duration - phase2Duration + 1);
}

/** Shared peak / trough references (avoids repeating the closed-form in two places). */
export function smilePeaks(
  L: number,
  inflationRate: number,
  phase1Premium: number,
  phase2Contraction: number,
  phase1Duration: number,
  phase2Duration: number,
): { p1Peak: number; r2: number; p2End: number } {
  const p1Peak = L * Math.pow(1 + inflationRate + phase1Premium, phase1Duration);
  const r2     = Math.max(inflationRate - phase2Contraction, 0.001);
  const p2End  = p1Peak * Math.pow(1 + r2, phase2Duration);
  return { p1Peak, r2, p2End };
}

function annualExpenseAtAge(age: number, cfg: MasterSimulatorConfig): number {
  if (age < cfg.retirementAge) return 0;

  const { currentAge, retirementAge, monthlyExpensesNative, inflationRate, spendingSmile } = cfg;

  if (!spendingSmile.isEnabled) {
    // FULL_CPI: unchanged original behaviour
    return monthlyExpensesNative * 12 * Math.pow(1 + inflationRate, age - currentAge);
  }

  // Nominal annual expense at the retirement date (pre-retirement CPI already baked in)
  const L = monthlyExpensesNative * 12 * Math.pow(1 + inflationRate, retirementAge - currentAge);
  const t = age - retirementAge;
  const { phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration } = spendingSmile;

  return computeSmileExpenseAtT(t, L, inflationRate, phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration);
}

/** Effective inflation rate used in each year (for DataLedger display). */
function effectiveInflationRateAt(age: number, cfg: MasterSimulatorConfig): number {
  if (age < cfg.retirementAge) return cfg.inflationRate;
  if (!cfg.spendingSmile.isEnabled) return cfg.inflationRate;
  const t = age - cfg.retirementAge;
  const { phase1Premium, phase2Contraction, phase3Escalator, phase1Duration, phase2Duration } = cfg.spendingSmile;
  if (t < phase1Duration)                        return cfg.inflationRate + phase1Premium;
  if (t < phase1Duration + phase2Duration)       return Math.max(cfg.inflationRate - phase2Contraction, 0.001);
  return cfg.inflationRate + phase3Escalator;
}

// ── Bucket operations ────────────────────────────────────────────────────────

/**
 * Cascade draw: deplete buckets in strategy-appropriate order.
 * 1-bucket: [b1]
 * 2-bucket: b1 → b2
 * 3-bucket: b1 → b2 → b3
 */
function cascadeDraw(
  b1: number, b2: number, b3: number,
  amount: number,
  strategy: StrategyType,
): [number, number, number] {
  let rem = amount;
  const take1 = Math.min(b1, rem); b1 -= take1; rem -= take1;
  if (strategy !== '1_BUCKET') {
    const take2 = Math.min(b2, rem); b2 -= take2; rem -= take2;
    if (strategy === '3_BUCKET') {
      const take3 = Math.min(b3, rem); b3 -= take3;
    }
  }
  return [b1, b2, b3];
}

/**
 * Grow each bucket by its effective annual return.
 * safetyCashFrac / safetyDebtFrac are pre-computed from initial asset proportions
 * and used each year to blend the 2-bucket safety rate dynamically.
 */
function growBuckets(
  b1: number, b2: number, b3: number,
  strategy: StrategyType,
  cashRate: number,
  effectiveDebtRate: number,
  effectiveEquityRate: number,
  // 1-bucket blended-rate fractions (computed once at init)
  blendedCashFrac: number,
  blendedDebtFrac: number,
  blendedEquityFrac: number,
  // 2-bucket B1 safety-bucket initial fractions
  safetyCashFrac: number,
  safetyDebtFrac: number,
): [number, number, number] {
  if (strategy === '1_BUCKET') {
    const blended =
      blendedCashFrac  * cashRate +
      blendedDebtFrac  * effectiveDebtRate +
      blendedEquityFrac * effectiveEquityRate;
    return [b1 * (1 + blended), 0, 0];
  }
  if (strategy === '2_BUCKET') {
    // Safety (B1) = Cash + Debt blend; Growth (B2) = Equity
    const safetyRate = safetyCashFrac * cashRate + safetyDebtFrac * effectiveDebtRate;
    return [b1 * (1 + safetyRate), b2 * (1 + effectiveEquityRate), 0];
  }
  // 3_BUCKET
  return [
    b1 * (1 + cashRate),
    b2 * (1 + effectiveDebtRate),
    b3 * (1 + effectiveEquityRate),
  ];
}

// ── Income stream helpers ────────────────────────────────────────────────────

/**
 * Total income credited from all active income streams in a given calendar year.
 *
 * For 'recurring' streams the annual amount is prorated by how many months of
 * the stream fall inside `year`:
 *   - Partial first year:  months = 13 − startMonth
 *   - Partial last year:   months = endMonth
 *   - Same year:           months = endMonth − startMonth + 1
 *   - Full middle year:    months = 12
 *
 * For 'one_time' streams the full lump sum fires once in startYear.
 *
 * Result is returned in `baseCurrency` after FX conversion.
 */
function computeIncomeForYear(
  calendarYear: number,
  cfg: MasterSimulatorConfig,
  baseCurrency: SupportedCurrency,
): number {
  if (!cfg.incomeStreams?.length) return 0;

  let total = 0;
  for (const s of cfg.incomeStreams) {
    const baseAmt = fxConvertWithOverrides(
      s.amount, s.currency, baseCurrency, cfg.fxOverrides ?? {}, baseCurrency,
    );

    if (s.frequency === 'one_time') {
      if (s.startYear === calendarYear) total += baseAmt;
    } else {
      // recurring — skip if outside window
      if (calendarYear < s.startYear || calendarYear > s.endYear) continue;
      let months: number;
      if (s.startYear === s.endYear) {
        months = Math.max(0, s.endMonth - s.startMonth + 1);
      } else if (calendarYear === s.startYear) {
        months = 13 - s.startMonth;          // startMonth through Dec
      } else if (calendarYear === s.endYear) {
        months = s.endMonth;                 // Jan through endMonth
      } else {
        months = 12;
      }
      total += baseAmt * months;
    }
  }
  return Math.max(0, total);
}

// ── Main simulation ─────────────────────────────────────────────────────────
export function executeSimulation(cfg: MasterSimulatorConfig): SimulationResult {
  const { currentAge, retirementAge, lifeExpectancy, strategy, baseCurrency } = cfg;

  // ── FX-normalize assets and split by strategy ─────────────────────────
  let b1 = 0, b2 = 0, b3 = 0;
  let cashTotal = 0, debtTotal = 0, equityTotal = 0;

  for (const asset of cfg.assets) {
    const v = Math.max(0, fxConvertWithOverrides(asset.currentValue || 0, asset.currency, baseCurrency, cfg.fxOverrides ?? {}, baseCurrency));
    if (asset.assetClass === 'Cash')   cashTotal   += v;
    if (asset.assetClass === 'Debt')   debtTotal   += v;
    if (asset.assetClass === 'Equity') equityTotal += v;

    if (strategy === '1_BUCKET') {
      b1 += v;
    } else if (strategy === '2_BUCKET') {
      if (asset.assetClass === 'Equity') b2 += v; else b1 += v;
    } else {
      if (asset.assetClass === 'Cash')        b1 += v;
      else if (asset.assetClass === 'Debt')   b2 += v;
      else                                    b3 += v;
    }
  }

  // Pre-compute blended-rate fractions (used by 1-bucket and 2-bucket growth)
  const totalAssets = cashTotal + debtTotal + equityTotal;
  const bCashFrac    = totalAssets > 0 ? cashTotal   / totalAssets : 0;
  const bDebtFrac    = totalAssets > 0 ? debtTotal   / totalAssets : 0;
  const bEquityFrac  = totalAssets > 0 ? equityTotal / totalAssets : 0;

  // 2-bucket safety fractions (fixed from initial allocation, used each year)
  const safetyTotal    = cashTotal + debtTotal;
  const safetyCashFrac = safetyTotal > 0 ? cashTotal / safetyTotal : 0;
  const safetyDebtFrac = safetyTotal > 0 ? debtTotal / safetyTotal : 1;

  // ── State ─────────────────────────────────────────────────────────────
  const dataPoints: SimulationDataPoint[] = [];
  let exhaustionAge: number | null = null;
  const baseYear = new Date().getFullYear();

  // t = 0: initial snapshot (no operations yet) — realTotal = nominal (0 years elapsed)
  dataPoints.push({
    age: currentAge,
    calendarYear: baseYear,
    bucket1: b1, bucket2: b2, bucket3: b3,
    total: b1 + b2 + b3,
    realTotal: b1 + b2 + b3,
    annualExpense: 0, annualOutflow: 0, annualInflow: 0,
    refillB1FromB2: 0, refillB2FromB3: 0,
    equityEffectiveRate: cfg.equityReturnRate,
    debtEffectiveRate: cfg.debtReturnRate,
    effectiveInflationRate: cfg.inflationRate,
    isInCrashWindow: false,
    marketStatus: 'ACCUMULATION',
  });

  // ── Year-by-year loop ──────────────────────────────────────────────────
  for (let age = currentAge; age < lifeExpectancy; age++) {
    const calendarYear        = baseYear + (age - currentAge);
    const marketStatus        = getMarketStatus(age, cfg, retirementAge);
    const effectiveEquityRate = getBearEquityRate(age, cfg);
    const effectiveDebtRate   = getBearDebtRate(age, cfg);
    const effInfl             = effectiveInflationRateAt(age, cfg);
    const isCrash             = marketStatus === 'CRASH';

    // Terminal zero guard
    if (b1 + b2 + b3 <= 0) {
      if (exhaustionAge === null) exhaustionAge = age;
      dataPoints.push({
        age: age + 1, calendarYear: calendarYear + 1,
        bucket1: 0, bucket2: 0, bucket3: 0, total: 0, realTotal: 0,
        annualExpense: 0, annualOutflow: 0, annualInflow: 0,
        refillB1FromB2: 0, refillB2FromB3: 0,
        equityEffectiveRate: effectiveEquityRate,
        debtEffectiveRate: effectiveDebtRate,
        effectiveInflationRate: effInfl,
        isInCrashWindow: isCrash,
        marketStatus,
      });
      continue;
    }

    let annualExpense  = 0;
    let annualOutflow  = 0;
    let annualInflow   = 0;
    let refillB1FromB2 = 0;
    let refillB2FromB3 = 0;

    const outflows = cfg.milestones.filter(m => m.targetAge === age && m.direction === 'outflow');
    const inflows  = cfg.milestones.filter(m => m.targetAge === age && m.direction === 'inflow');

    const toBase = (m: (typeof cfg.milestones)[0]) =>
      fxConvertWithOverrides(m.amountRequired, m.currency, baseCurrency as SupportedCurrency, cfg.fxOverrides ?? {}, baseCurrency as SupportedCurrency);

    if (age < retirementAge) {
      // ── PRE-RETIREMENT: grow → outflows → inflows → income ──────────
      [b1, b2, b3] = growBuckets(b1, b2, b3, strategy,
        cfg.cashReturnRate, effectiveDebtRate, effectiveEquityRate,
        bCashFrac, bDebtFrac, bEquityFrac, safetyCashFrac, safetyDebtFrac);

      for (const m of outflows) {
        const amt = toBase(m); annualOutflow += amt;
        [b1, b2, b3] = cascadeDraw(b1, b2, b3, amt, strategy);
      }
      for (const m of inflows) {
        const amt = toBase(m); annualInflow += amt;
        b1 += amt; // milestone inflows land in the most-liquid bucket
      }

      // Regular income / savings contributions → growth bucket
      const incomeContrib = computeIncomeForYear(calendarYear, cfg, baseCurrency as SupportedCurrency);
      if (incomeContrib > 0) {
        annualInflow += incomeContrib;
        // Route new savings to highest-growth bucket
        if (strategy === '3_BUCKET')      b3 += incomeContrib;
        else if (strategy === '2_BUCKET') b2 += incomeContrib;
        else                              b1 += incomeContrib;
      }

    } else {
      // ── POST-RETIREMENT ─────────────────────────────────────────────
      annualExpense = annualExpenseAtAge(age, cfg);

      // Step 1 — Inflows
      for (const m of inflows) {
        const amt = toBase(m); annualInflow += amt;
        b1 += amt;
      }

      // Step 2 — Milestone outflows
      for (const m of outflows) {
        const amt = toBase(m); annualOutflow += amt;
        [b1, b2, b3] = cascadeDraw(b1, b2, b3, amt, strategy);
      }

      // Step 3 — Living expenses (cascade from B1)
      [b1, b2, b3] = cascadeDraw(b1, b2, b3, annualExpense, strategy);

      // Step 4 — Bucket replenishment (always allowed — no freeze policy)
      if (strategy !== '1_BUCKET') {
        if (strategy === '3_BUCKET') {
          // B1 ← B2 (cash ← debt: always OK)
          const b1Target = cfg.bucket1TargetYears * annualExpense;
          if (b1 < b1Target && b2 > 0) {
            const t = Math.min(b2, b1Target - b1);
            refillB1FromB2 = t; b1 += t; b2 -= t;
          }
          // B2 ← B3 (debt ← equity)
          const b2Target = cfg.bucket2TargetYears * annualExpense;
          if (b2 < b2Target && b3 > 0) {
            const t = Math.min(b3, b2Target - b2);
            refillB2FromB3 = t; b2 += t; b3 -= t;
          }
        } else if (strategy === '2_BUCKET') {
          // B1 ← B2 (safety ← equity)
          const b1Target = cfg.bucket1TargetYears * annualExpense;
          if (b1 < b1Target && b2 > 0) {
            const t = Math.min(b2, b1Target - b1);
            refillB1FromB2 = t; b1 += t; b2 -= t;
          }
        }
      }

      // Step 5 — Grow residuals
      [b1, b2, b3] = growBuckets(b1, b2, b3, strategy,
        cfg.cashReturnRate, effectiveDebtRate, effectiveEquityRate,
        bCashFrac, bDebtFrac, bEquityFrac, safetyCashFrac, safetyDebtFrac);
    }

    // Clamp floating-point negatives
    b1 = Math.max(0, b1);
    b2 = Math.max(0, b2);
    b3 = Math.max(0, b3);

    const newTotal = b1 + b2 + b3;
    if (newTotal <= 0 && exhaustionAge === null) exhaustionAge = age + 1;

    // Deflate to today's purchasing power: divide by cumulative CPI
    const yearsElapsed = (age + 1) - currentAge;
    const realTotal = newTotal / Math.pow(1 + cfg.inflationRate, yearsElapsed);

    dataPoints.push({
      age: age + 1,
      calendarYear: calendarYear + 1,
      bucket1: b1, bucket2: b2, bucket3: b3,
      total: newTotal,
      realTotal,
      annualExpense,
      annualOutflow,
      annualInflow,
      refillB1FromB2,
      refillB2FromB3,
      equityEffectiveRate: effectiveEquityRate,
      debtEffectiveRate: effectiveDebtRate,
      effectiveInflationRate: effInfl,
      isInCrashWindow: isCrash,
      marketStatus,
    });
  }

  const last = dataPoints[dataPoints.length - 1];
  const yearsTotal = lifeExpectancy - currentAge;
  return {
    dataPoints,
    exhaustionAge,
    finalEstateValue:     last?.total     ?? 0,
    finalEstateValueReal: last?.realTotal ?? 0,
    isFunded: exhaustionAge === null || exhaustionAge >= lifeExpectancy,
  };
}
