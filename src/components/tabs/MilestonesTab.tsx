'use client';

import {
  MasterSimulatorConfig,
  MultiCurrencyMilestone,
  MilestoneDirection,
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
import { Trash2, Plus, Flag, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrencyShort } from '@/lib/formatters';

interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  themePrimaryColor: string;
}

export default function MilestonesTab({ config, onUpdate, themePrimaryColor }: Props) {
  const { milestones, baseCurrency } = config;

  const update = (id: string, patch: Partial<MultiCurrencyMilestone>) =>
    onUpdate({
      milestones: milestones.map((m) => {
        if (m.id !== id) return m;
        // If currency is changing, convert the stored amount to preserve real-world value
        if (patch.currency && patch.currency !== m.currency) {
          patch = {
            ...patch,
            amountRequired: fxConvertWithOverrides(
              m.amountRequired || 0,
              m.currency,
              patch.currency as SupportedCurrency,
              config.fxOverrides ?? {},
              baseCurrency,
            ),
          };
        }
        return { ...m, ...patch };
      }),
    });

  const remove = (id: string) =>
    onUpdate({ milestones: milestones.filter((m) => m.id !== id) });

  const add = (direction: MilestoneDirection) =>
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
        },
      ],
    });

  const outflows = milestones.filter((m) => m.direction === 'outflow');
  const inflows  = milestones.filter((m) => m.direction === 'inflow');

  return (
    <div className="pt-4 space-y-5">

      {/* ── Outflows ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-semibold text-slate-700">Capital Outflows</p>
            <span className="text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-0.5 font-medium">{outflows.length}</span>
          </div>
          <Button size="sm" variant="outline"
            className="gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => add('outflow')}>
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
            <MilestoneCard key={m.id} m={m} config={config} onUpdate={update} onRemove={remove} />
          ))}
        </div>
      </div>

      {/* ── Inflows ──────────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm font-semibold text-slate-700">Capital Inflows</p>
            <span className="text-[10px] bg-green-50 text-green-700 rounded-full px-2 py-0.5 font-medium">{inflows.length}</span>
          </div>
          <Button size="sm" variant="outline"
            className="gap-1 text-xs border-green-200 text-green-600 hover:bg-green-50"
            onClick={() => add('inflow')}>
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
            <MilestoneCard key={m.id} m={m} config={config} onUpdate={update} onRemove={remove} />
          ))}
        </div>
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-6 text-slate-300">
          <Flag className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No milestones yet</p>
        </div>
      )}
    </div>
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
  const { baseCurrency } = config;
  const isInflow  = m.direction === 'inflow';
  const accent    = isInflow ? 'border-green-200 bg-green-50/30' : 'border-red-100 bg-red-50/20';
  const phase     = m.targetAge < config.retirementAge ? 'Pre-retirement' : 'Post-retirement';
  const baseValue = fxConvertWithOverrides(m.amountRequired, m.currency, baseCurrency, config.fxOverrides ?? {}, baseCurrency);
  const isForeign = m.currency !== baseCurrency;

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

            {/* Age + currency + amount */}
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

            {/* Summary */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400">
              <span>
                {isInflow ? '+' : '−'} {formatCurrencyShort(m.amountRequired, m.currency)} at age {m.targetAge}
                {isForeign && (
                  <span className="text-slate-300 ml-1">
                    ≈ {formatCurrencyShort(baseValue, baseCurrency)} in {baseCurrency}
                  </span>
                )}
              </span>
              <span
                className="px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: `${isInflow ? '#22c55e' : '#ef4444'}18`, color: isInflow ? '#16a34a' : '#dc2626' }}
              >
                {phase}
              </span>
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
