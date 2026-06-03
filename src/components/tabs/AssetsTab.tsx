'use client';

import {
  MasterSimulatorConfig,
  MultiCurrencyAsset,
  AssetClass,
  SupportedCurrency,
  CURRENCY_LABELS,
  fxConvertWithOverrides,
} from '@/types/workspace';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/lib/formatters';

const CLASS_META: Record<AssetClass, { color: string; bg: string; dot: string; bucket3: string; bucket2: string }> = {
  Equity: { color: 'text-violet-700', bg: 'bg-violet-50', dot: '#8b5cf6', bucket3: 'B3 — Growth',  bucket2: 'Growth'  },
  Debt:   { color: 'text-blue-700',   bg: 'bg-blue-50',   dot: '#3b82f6', bucket3: 'B2 — Debt',    bucket2: 'Safety'  },
  Cash:   { color: 'text-green-700',  bg: 'bg-green-50',  dot: '#22c55e', bucket3: 'B1 — Liquid',  bucket2: 'Safety'  },
};

interface Props {
  config: MasterSimulatorConfig;
  onUpdate: (u: Partial<MasterSimulatorConfig>) => void;
  themePrimaryColor: string;
}

export default function AssetsTab({ config, onUpdate, themePrimaryColor }: Props) {
  const { assets, baseCurrency, strategy } = config;

  const updateAsset = (id: string, patch: Partial<MultiCurrencyAsset>) =>
    onUpdate({
      assets: assets.map((a) => {
        if (a.id !== id) return a;
        // If the currency is changing, convert the stored value to preserve real-world amount
        if (patch.currency && patch.currency !== a.currency) {
          patch = {
            ...patch,
            currentValue: fxConvertWithOverrides(
              a.currentValue || 0,
              a.currency,
              patch.currency,
              fxOvr,
              baseCurrency,
            ),
          };
        }
        return { ...a, ...patch };
      }),
    });

  const deleteAsset = (id: string) =>
    onUpdate({ assets: assets.filter((a) => a.id !== id) });

  const addAsset = () =>
    onUpdate({
      assets: [
        ...assets,
        { id: `a${Date.now()}`, assetClass: 'Equity', displayName: 'New Asset', currency: baseCurrency, currentValue: 0 },
      ],
    });

  // Totals by asset class (FX-converted to base)
  const fxOvr = config.fxOverrides ?? {};
  const totals: Record<AssetClass, number> = { Cash: 0, Debt: 0, Equity: 0 };
  assets.forEach((a) => {
    totals[a.assetClass] += fxConvertWithOverrides(Math.max(0, a.currentValue || 0), a.currency, baseCurrency, fxOvr, baseCurrency);
  });
  const grandTotal = totals.Cash + totals.Debt + totals.Equity;

  return (
    <div className="pt-4 space-y-4">

      {/* ── Asset-class summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {(['Cash', 'Debt', 'Equity'] as AssetClass[]).map((cls) => {
          const m = CLASS_META[cls];
          const bucketLabel = strategy === '2_BUCKET' ? m.bucket2 : strategy === '3_BUCKET' ? m.bucket3 : '1-Pool';
          return (
            <div key={cls} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.dot }} />
                <span className="text-[10px] font-semibold text-slate-500">{cls}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{formatCurrencyShort(totals[cls], baseCurrency)}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{bucketLabel}</p>
            </div>
          );
        })}
      </div>

      {/* ── Net worth + add ─────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Net Worth</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(grandTotal, baseCurrency)}</p>
        </div>
        <Button
          size="sm" className="gap-1.5 text-white text-xs"
          style={{ backgroundColor: themePrimaryColor }}
          onClick={addAsset}
        >
          <Plus className="w-3.5 h-3.5" /> Add Asset
        </Button>
      </div>

      {/* ── Asset rows ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        {assets.map((asset) => {
          const m = CLASS_META[asset.assetClass];
          const baseValue = fxConvertWithOverrides(asset.currentValue || 0, asset.currency, baseCurrency, fxOvr, baseCurrency);
          const isForeign = asset.currency !== baseCurrency;
          return (
            <div key={asset.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 space-y-2">
              {/* Row 1: assetClass + name + delete */}
              <div className="flex gap-2 items-center">
                <Select
                  value={asset.assetClass}
                  onValueChange={(v) => v && updateAsset(asset.id, { assetClass: v as AssetClass })}
                >
                  <SelectTrigger className={`w-[110px] shrink-0 h-7 text-xs font-semibold border-0 ${m.bg} ${m.color}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Debt">Debt</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={asset.displayName}
                  onChange={(e) => updateAsset(asset.id, { displayName: e.target.value })}
                  className="flex-1 h-7 text-xs"
                  placeholder="Asset description"
                />
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 shrink-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => deleteAsset(asset.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Row 2: value + currency */}
              <div className="flex items-center gap-2">
                {/* Currency selector */}
                <Select
                  value={asset.currency}
                  onValueChange={(v) => v && updateAsset(asset.id, { currency: v as SupportedCurrency })}
                >
                  <SelectTrigger className="w-[70px] shrink-0 h-7 text-xs border-slate-200">
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
                  value={asset.currentValue}
                  onChange={(e) => updateAsset(asset.id, { currentValue: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-sm font-mono flex-1"
                  placeholder="0"
                />

                {isForeign ? (
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    ≈ {formatCurrencyShort(baseValue, baseCurrency)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                    = {formatCurrencyShort(baseValue, baseCurrency)}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {assets.length === 0 && (
          <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-sm">No assets added yet</p>
            <p className="text-xs mt-1">Click &quot;Add Asset&quot; to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
