'use client';

import {
  MasterSimulatorConfig,
  MultiCurrencyMilestone,
  IncomeStream,
  IncomeFrequency,
  MilestoneBucket,
  MilestoneDirection,
  StrategyType,
  SupportedCurrency,
  CURRENCY_LABELS,
  fxConvertWithOverrides,
} from '@/types/workspace';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Trash2, Plus, Flag, ArrowDownCircle, ArrowUpCircle, TrendingUp, AlertCircle,
} from 'lucide-react';
import { formatCurrencyShort } from '@/lib/formatters';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  { v: 1, l: 'Jan' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' },
  { v: 4, l: 'Apr' }, { v: 5, l: 'May' }, { v: 6, l: 'Jun' },
  { v: 7, l: 'Jul' }, { v: 8, l: 'Aug' }, { v: 9, l: 'Sep' },
  { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' },
];

// ── Bucket helpers ────────────────────────────────────────────────────────────

interface BucketOption { value: MilestoneBucket; label: string }

/** Returns the bucket options for capital events (inflows / outflows). */
function bucketOptions(strategy: StrategyType, direction: MilestoneDirection): BucketOption[] {
  const verb = direction === 'outflow' ? 'Draw from' : 'Deposit to';
  const base: BucketOption[] = [
    { value: 'auto', label: direction === 'outflow' ? 'Auto (cascade)' : 'Auto (liquid)' },
  ];
  if (strategy === '1_BUCKET') return base;
  if (strategy === '2_BUCKET') return [
    ...base,
    { value: 'b1', label: `${verb} Safety (Cash + Debt)` },
    { value: 'b2', label: `${verb} Growth (Equity)` },
  ];
  return [
    ...base,
    { value: 'b1', label: `${verb} Cash (B1)` },
    { value: 'b2', label: `${verb} Debt (B2)` },
    { value: 'b3', label: `${verb} Equity (B3)` },
  ];
}

/** Returns the bucket options for income streams (deposit direction only). */
function incomeBucketOptions(strategy: StrategyType): BucketOption[] {
  const base: BucketOption[] = [
    { value: 'auto', label: 'Auto (growth / equity)' },
  ];
  if (strategy === '1_BUCKET') return base;
  if (strategy === '2_BUCKET') return [
    ...base,
    { value: 'b1', label: 'Deposit to Safety (Cash + Debt)' },
    { value: 'b2', label: 'Deposit to Growth (Equity)' },
  ];
  return [
    ...base,
    { value: 'b1', label: 'Deposit to Cash (B1)' },
    { value: 'b2', label: 'Deposit to Debt (B2)' },
    { value: 'b3', label: 'Deposit to Equity (B3)' },
  ];
}

/** Short display label for the selected bucket (used in summary strip). */
function bucketShortLabel(
  bucket: MilestoneBucket,
  strategy: StrategyType,
  autoLabel = 'Auto',
): string {
  if (bucket === 'auto') return autoLabel;
  if (strategy === '1_BUCKET') return 'Portfolio';
  if (strategy === '2_BUCKET') return bucket === 'b1' ? 'Safety' : 'Growth';
  const map: Record<MilestoneBucket, string> = { auto: '', b1: 'Cash', b2: 'Debt', b3: 'Equity' };
  return map[bucket];
}

/** Returns true when the end date is strictly earlier than the start date. */
function isEndBeforeStart(s: IncomeStream): boolean {
  if (s.endYear < s.startYear) return true;
  if (s.endYear === s.startYear && s.endMonth < s.startMonth) return true;
  return false;
}

function deriveCurrentYear(): number { return new Date().getFullYear(); }

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  themePrimaryColor: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MilestonesTab({ config, onUpdate, themePrimaryColor }: Props) {
  const { milestones, incomeStreams = [], baseCurrency } = config;
  const currentYear   = deriveCurrentYear();
  const retirementYear = currentYear + Math.max(0, config.retirementAge - config.currentAge);

  // ── Milestone helpers ─────────────────────────────────────────────────────

  const updateMilestone = (id: string, patch: Partial<MultiCurrencyMilestone>) =>
    onUpdate({
      milestones: milestones.map((m) => {
        if (m.id !== id) return m;
        if (patch.currency && patch.currency !== m.currency) {
          patch = {
            ...patch,
            amountRequired: fxConvertWithOverrides(
              m.amountRequired || 0, m.currency,
              patch.currency as SupportedCurrency, config.fxOverrides ?? {}, baseCurrency,
            ),
          };
        }
        return { ...m, ...patch };
      }),
    });

  const removeMilestone = (id: string) =>
    onUpdate({ milestones: milestones.filter((m) => m.id !== id) });

  const addMilestone = (direction: MilestoneDirection) =>
    onUpdate({
      milestones: [
        ...milestones,
        {
          id: `m${Date.now()}`,
          description: direction === 'inflow' ? 'New Income Event' : 'New Capital Event',
          targetAge:   config.retirementAge,
          currency:    baseCurrency,
          amountRequired: 1_000_000,
          direction,
          bucket: 'auto' as MilestoneBucket,
        },
      ],
    });

  // ── Income stream helpers ─────────────────────────────────────────────────

  const updateIncome = (id: string, patch: Partial<IncomeStream>) => {
    onUpdate({
      incomeStreams: incomeStreams.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        // Currency change → convert stored amount
        if (patch.currency && patch.currency !== s.currency) {
          next.amount = fxConvertWithOverrides(
            s.amount, s.currency, patch.currency as SupportedCurrency,
            config.fxOverrides ?? {}, baseCurrency,
          );
        }
        // One-time: keep end locked to start
        if (next.frequency === 'one_time') {
          next.endMonth = next.startMonth;
          next.endYear  = next.startYear;
        }
        return next;
      }),
    });
  };

  const removeIncome = (id: string) =>
    onUpdate({ incomeStreams: incomeStreams.filter((s) => s.id !== id) });

  const addIncome = () => {
    const now = new Date();
    onUpdate({
      incomeStreams: [
        ...incomeStreams,
        {
          id: `inc${Date.now()}`,
          description:  'Monthly SIP / Savings',
          frequency:    'recurring',
          currency:     baseCurrency,
          amount:       10_000,
          startMonth:   now.getMonth() + 1,
          startYear:    currentYear,
          endMonth:     12,
          endYear:      retirementYear,
        } satisfies IncomeStream,
      ],
    });
  };

  const outflows = milestones.filter((m) => m.direction === 'outflow');
  const inflows  = milestones.filter((m) => m.direction === 'inflow');

  return (
    <div className="pt-4 space-y-5">

      {/* ══ ACCUMULATION INCOME ════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <p className="text-sm font-semibold text-slate-700">Accumulation Income</p>
            <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-medium">
              {incomeStreams.length}
            </span>
          </div>
          <Button size="sm" variant="outline"
            className="gap-1 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={addIncome}>
            <Plus className="w-3 h-3" /> Add Income
          </Button>
        </div>

        {incomeStreams.length === 0 && (
          <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
            No income streams — e.g. salary savings, SIP, rental income
          </div>
        )}

        <div className="space-y-3">
          {incomeStreams.map((s) => (
            <IncomeStreamCard
              key={s.id}
              stream={s}
              config={config}
              currentYear={currentYear}
              retirementYear={retirementYear}
              onUpdate={updateIncome}
              onRemove={removeIncome}
            />
          ))}
        </div>
      </div>

      {/* ══ CAPITAL OUTFLOWS ══════════════════════════════════════════ */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-semibold text-slate-700">Capital Outflows</p>
            <span className="text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">
              {outflows.length}
            </span>
          </div>
          <Button size="sm" variant="outline"
            className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => addMilestone('outflow')}>
            <Plus className="w-3 h-3" /> Add Outflow
          </Button>
        </div>

        {outflows.length === 0 && (
          <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
            No outflows — e.g. child education, property purchase
          </div>
        )}
        <div className="space-y-3">
          {outflows.map((m) => (
            <MilestoneCard key={m.id} m={m} config={config} onUpdate={updateMilestone} onRemove={removeMilestone} />
          ))}
        </div>
      </div>

      {/* ══ CAPITAL INFLOWS ═══════════════════════════════════════════ */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm font-semibold text-slate-700">Capital Inflows</p>
            <span className="text-[10px] bg-green-50 text-green-700 rounded-full px-2 py-0.5 font-medium">
              {inflows.length}
            </span>
          </div>
          <Button size="sm" variant="outline"
            className="gap-1 text-xs border-green-200 text-green-600 hover:bg-green-50"
            onClick={() => addMilestone('inflow')}>
            <Plus className="w-3 h-3" /> Add Inflow
          </Button>
        </div>

        {inflows.length === 0 && (
          <div className="text-center py-5 text-slate-400 border border-dashed border-slate-200 rounded-lg text-xs">
            No inflows — e.g. pension lump sum, property sale
          </div>
        )}
        <div className="space-y-3">
          {inflows.map((m) => (
            <MilestoneCard key={m.id} m={m} config={config} onUpdate={updateMilestone} onRemove={removeMilestone} />
          ))}
        </div>
      </div>

      {incomeStreams.length === 0 && milestones.length === 0 && (
        <div className="text-center py-6 text-slate-300">
          <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No events yet</p>
        </div>
      )}
    </div>
  );
}

// ── IncomeStreamCard ──────────────────────────────────────────────────────────

interface IncomeCardProps {
  stream: IncomeStream;
  config: MasterSimulatorConfig;
  currentYear: number;
  retirementYear: number;
  onUpdate: (id: string, patch: Partial<IncomeStream>) => void;
  onRemove: (id: string) => void;
}

function IncomeStreamCard({ stream: s, config, currentYear, retirementYear, onUpdate, onRemove }: IncomeCardProps) {
  const { baseCurrency, strategy } = config;
  const isRecurring  = s.frequency === 'recurring';
  const hasError     = isRecurring && isEndBeforeStart(s);
  const activeBucket = s.bucket ?? 'auto';
  const bktOptions   = incomeBucketOptions(strategy);
  const showBucket   = strategy !== '1_BUCKET';

  // Estimated annual contribution in base currency (for summary line)
  const baseAmt = fxConvertWithOverrides(s.amount, s.currency, baseCurrency, config.fxOverrides ?? {}, baseCurrency);
  const annualEst = isRecurring ? baseAmt * 12 : baseAmt;
  const isForeign = s.currency !== baseCurrency;

  const setFreq = (freq: IncomeFrequency) => onUpdate(s.id, { frequency: freq });

  return (
    <Card className={`border ${hasError ? 'border-red-300 bg-red-50/20' : 'border-blue-200 bg-blue-50/20'}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-3 min-w-0">

            {/* Row 1: Description + frequency toggle */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-slate-500">Description</Label>
                <Input
                  value={s.description}
                  onChange={(e) => onUpdate(s.id, { description: e.target.value })}
                  className="mt-1 h-8 text-sm"
                  placeholder="e.g. Monthly SIP, Salary Savings"
                />
              </div>
              {/* One-time / Recurring pill toggle */}
              <div className="shrink-0 mt-5">
                <div className="flex rounded-md border border-slate-200 overflow-hidden text-[10px] font-semibold h-8">
                  <button
                    type="button"
                    onClick={() => setFreq('one_time')}
                    className={[
                      'px-2.5 flex items-center transition-colors',
                      !isRecurring
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    One-time
                  </button>
                  <button
                    type="button"
                    onClick={() => setFreq('recurring')}
                    className={[
                      'px-2.5 flex items-center border-l border-slate-200 transition-colors',
                      isRecurring
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Recurring
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Currency + Amount */}
            <div>
              <Label className="text-[10px] text-slate-500">
                {isRecurring ? 'Monthly Amount' : 'Lump-Sum Amount'}
              </Label>
              <div className="flex gap-1 mt-1">
                <Select
                  value={s.currency}
                  onValueChange={(v) => v && onUpdate(s.id, { currency: v as SupportedCurrency })}
                >
                  <SelectTrigger className="w-[62px] shrink-0 h-8 text-xs border-slate-200 px-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CURRENCY_LABELS) as SupportedCurrency[]).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number" min={0}
                  value={s.amount}
                  onChange={(e) => onUpdate(s.id, { amount: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm font-mono flex-1"
                />
              </div>
            </div>

            {/* Row 3: Start date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">
                  {isRecurring ? 'Start Month / Year' : 'Month / Year'}
                </Label>
                <div className="flex gap-1 mt-1">
                  <Select
                    value={String(s.startMonth)}
                    onValueChange={(v) => v != null && onUpdate(s.id, { startMonth: parseInt(v) })}
                  >
                    <SelectTrigger className="w-[58px] shrink-0 h-8 text-xs px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={s.startYear}
                    onChange={(e) => onUpdate(s.id, { startYear: parseInt(e.target.value) || currentYear })}
                    className="h-8 text-sm font-mono flex-1 text-center"
                    min={currentYear - 5}
                    max={retirementYear + 5}
                  />
                </div>
              </div>

              {/* End date — hidden for one-time (auto-mirrors start) */}
              {isRecurring && (
                <div>
                  <Label className={`text-[10px] ${hasError ? 'text-red-500' : 'text-slate-500'}`}>
                    End Month / Year
                  </Label>
                  <div className="flex gap-1 mt-1">
                    <Select
                      value={String(s.endMonth)}
                      onValueChange={(v) => v != null && onUpdate(s.id, { endMonth: parseInt(v) })}
                    >
                      <SelectTrigger className={`w-[58px] shrink-0 h-8 text-xs px-1.5 ${hasError ? 'border-red-400' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={s.endYear}
                      onChange={(e) => onUpdate(s.id, { endYear: parseInt(e.target.value) || currentYear })}
                      className={`h-8 text-sm font-mono flex-1 text-center ${hasError ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                      min={currentYear - 5}
                      max={retirementYear + 5}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bucket selector */}
            {showBucket && (
              <div>
                <Label className="text-[10px] text-slate-500">Deposit to Bucket</Label>
                <Select
                  value={activeBucket}
                  onValueChange={(v) => v && onUpdate(s.id, { bucket: v as MilestoneBucket })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bktOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Validation error */}
            {hasError && (
              <div className="flex items-center gap-1.5 text-[10px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5">
                <AlertCircle className="w-3 h-3 shrink-0" />
                End date cannot be earlier than start date
              </div>
            )}

            {/* Summary */}
            {!hasError && (
              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
                <span>
                  {isRecurring ? (
                    <>
                      +{formatCurrencyShort(s.amount, s.currency)}/mo ·
                      est.&nbsp;{formatCurrencyShort(annualEst, s.currency)}/yr
                      {isForeign && (
                        <span className="text-slate-300 ml-1">
                          ≈ {formatCurrencyShort(fxConvertWithOverrides(annualEst, s.currency, baseCurrency, config.fxOverrides ?? {}, baseCurrency), baseCurrency)} in {baseCurrency}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      +{formatCurrencyShort(s.amount, s.currency)} in {MONTHS[s.startMonth - 1]?.l} {s.startYear}
                      {isForeign && (
                        <span className="text-slate-300 ml-1">
                          ≈ {formatCurrencyShort(baseAmt, baseCurrency)} in {baseCurrency}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  {showBucket && (
                    <span className="px-1.5 py-0.5 rounded font-medium bg-blue-50 text-blue-600">
                      → {bucketShortLabel(activeBucket, strategy, 'Growth')}
                    </span>
                  )}
                  {isRecurring && (
                    <span className="px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-500">
                      {MONTHS[s.startMonth - 1]?.l} {s.startYear} → {MONTHS[s.endMonth - 1]?.l} {s.endYear}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 mt-1"
            onClick={() => onRemove(s.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── MilestoneCard ─────────────────────────────────────────────────────────────

interface CardProps {
  m: MultiCurrencyMilestone;
  config: MasterSimulatorConfig;
  onUpdate: (id: string, patch: Partial<MultiCurrencyMilestone>) => void;
  onRemove: (id: string) => void;
}

function MilestoneCard({ m, config, onUpdate, onRemove }: CardProps) {
  const { baseCurrency, strategy } = config;
  const isInflow  = m.direction === 'inflow';
  const accent    = isInflow ? 'border-green-200 bg-green-50/30' : 'border-red-100 bg-red-50/20';
  const phase     = m.targetAge < config.retirementAge ? 'Pre-retirement' : 'Post-retirement';
  const baseValue = fxConvertWithOverrides(m.amountRequired, m.currency, baseCurrency, config.fxOverrides ?? {}, baseCurrency);
  const isForeign = m.currency !== baseCurrency;

  const activeBucket  = m.bucket ?? 'auto';
  const bktOptions    = bucketOptions(strategy, m.direction);
  const showBucket    = strategy !== '1_BUCKET'; // 1-bucket has only one bucket

  return (
    <Card className={`border ${accent}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 space-y-3 min-w-0">

            {/* Description */}
            <div>
              <Label className="text-[10px] text-slate-500">Description</Label>
              <Input
                value={m.description}
                onChange={(e) => onUpdate(m.id, { description: e.target.value })}
                className="mt-1 h-8 text-sm"
                placeholder={isInflow ? 'e.g. Pension Lump Sum' : 'e.g. Child Education'}
              />
            </div>

            {/* Age + Currency + Amount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Target Age</Label>
                <Input
                  type="number"
                  value={m.targetAge}
                  onChange={(e) => onUpdate(m.id, { targetAge: parseInt(e.target.value) || 0 })}
                  className="mt-1 h-8 text-sm text-center"
                  min={config.currentAge} max={config.lifeExpectancy}
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">
                  {isInflow ? 'Amount Received' : 'Amount Required'}
                </Label>
                <div className="flex gap-1 mt-1">
                  <Select
                    value={m.currency}
                    onValueChange={(v) => v && onUpdate(m.id, { currency: v as SupportedCurrency })}
                  >
                    <SelectTrigger className="w-[62px] shrink-0 h-8 text-xs border-slate-200 px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CURRENCY_LABELS) as SupportedCurrency[]).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0}
                    value={m.amountRequired}
                    onChange={(e) => onUpdate(m.id, { amountRequired: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm font-mono flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Bucket selector — hidden for 1-bucket strategy */}
            {showBucket && (
              <div>
                <Label className="text-[10px] text-slate-500">
                  {isInflow ? 'Deposit to Bucket' : 'Draw from Bucket'}
                </Label>
                <Select
                  value={activeBucket}
                  onValueChange={(v) => v && onUpdate(m.id, { bucket: v as MilestoneBucket })}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bktOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary strip */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
              <span>
                {isInflow ? '+' : '−'} {formatCurrencyShort(m.amountRequired, m.currency)} at age {m.targetAge}
                {isForeign && (
                  <span className="text-slate-300 ml-1">
                    ≈ {formatCurrencyShort(baseValue, baseCurrency)} in {baseCurrency}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1">
                {/* Bucket badge */}
                {showBucket && (
                  <span className={[
                    'px-1.5 py-0.5 rounded font-medium',
                    isInflow ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500',
                  ].join(' ')}>
                    {isInflow ? '→' : '←'} {bucketShortLabel(activeBucket, strategy)}
                  </span>
                )}
                {/* Pre/post-retirement badge */}
                <span
                  className="px-1.5 py-0.5 rounded font-medium"
                  style={{ backgroundColor: `${isInflow ? '#22c55e' : '#ef4444'}18`, color: isInflow ? '#16a34a' : '#dc2626' }}
                >
                  {phase}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50 mt-1"
            onClick={() => onRemove(m.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
