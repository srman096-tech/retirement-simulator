'use client';

import { useState, useRef } from 'react';
import { Download, Trash2, FileJson, FileText, ShieldCheck, ChevronDown, ChevronUp, Upload, DatabaseBackup } from 'lucide-react';
import { MasterSimulatorConfig } from '@/types/workspace';
import { exportAsJSON, exportAsCSV, saveDataset, purgeLocalData } from '@/lib/secureStorage';

interface Props {
  config: MasterSimulatorConfig;
  onPurge: () => void;
  onLoadDataset: (config: MasterSimulatorConfig) => void;
}

export default function GDPRControls({ config, onPurge, onLoadDataset }: Props) {
  const [expanded, setExpanded]         = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [exported, setExported]         = useState<'json' | 'csv' | 'dataset' | null>(null);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    exportAsJSON(config);
    setExported('json');
    setTimeout(() => setExported(null), 2500);
  };

  const handleExportCSV = () => {
    exportAsCSV(config);
    setExported('csv');
    setTimeout(() => setExported(null), 2500);
  };

  const handleSaveDataset = () => {
    saveDataset(config);
    setExported('dataset');
    setTimeout(() => setExported(null), 2500);
  };

  const handleLoadDataset = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoadError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);
        // Accept both bare config and wrapped { workspace: config } formats
        const workspaceData: unknown =
          parsed?.workspace ?? parsed;
        if (
          typeof workspaceData !== 'object' ||
          workspaceData === null ||
          !('currentAge' in workspaceData) ||
          !('assets' in workspaceData)
        ) {
          throw new Error('File does not appear to be a valid retirement dataset.');
        }
        onLoadDataset(workspaceData as MasterSimulatorConfig);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to parse file.');
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-loaded if needed
    e.target.value = '';
  };

  const handlePurge = () => {
    if (!confirmPurge) {
      setConfirmPurge(true);
      return;
    }
    purgeLocalData();
    setConfirmPurge(false);
    onPurge();
  };

  return (
    <div className="border-t border-black/[0.06] bg-[#f8f9fa]">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => { setExpanded(v => !v); setConfirmPurge(false); setLoadError(null); }}
        className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-black/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Privacy &amp; Data
          </span>
        </div>
        {expanded
          ? <ChevronUp  className="w-3.5 h-3.5 text-slate-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        }
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3">

          {/* Status chip */}
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All data processed locally in your browser · No server transmission
          </div>

          {/* ── Dataset Save / Load ─────────────────────────────────────── */}
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <DatabaseBackup className="w-3 h-3" />
              Dataset
            </p>
            <div className="flex gap-2">
              {/* Save Dataset */}
              <button
                type="button"
                onClick={handleSaveDataset}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-semibold transition-all',
                  exported === 'dataset'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-black/[0.08] text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
                title="Save current parameters as a portable .json file you can reload later"
              >
                <Download className="w-3 h-3" />
                {exported === 'dataset' ? 'Saved ✓' : 'Save Dataset'}
              </button>

              {/* Load Dataset */}
              <button
                type="button"
                onClick={() => { setLoadError(null); fileInputRef.current?.click(); }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 py-2 text-[10px] font-semibold transition-all"
                title="Upload a previously saved dataset .json file to restore all parameters"
              >
                <Upload className="w-3 h-3" />
                Load Dataset
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleLoadDataset}
              />
            </div>
            {loadError && (
              <p className="text-[9px] text-red-500 mt-1 leading-[1.4]">{loadError}</p>
            )}
            <p className="text-[9px] text-slate-400 mt-1 leading-[1.4]">
              Save / Load stores only simulation parameters — no personal identifiers beyond what you enter.
            </p>
          </div>

          {/* ── GDPR Export ─────────────────────────────────────────────── */}
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Export My Profile <span className="normal-case font-normal">(GDPR Art. 20)</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-semibold transition-all',
                  exported === 'json'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-black/[0.08] text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <FileJson className="w-3 h-3" />
                {exported === 'json' ? 'Downloaded ✓' : 'JSON'}
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-[10px] font-semibold transition-all',
                  exported === 'csv'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-black/[0.08] text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <FileText className="w-3 h-3" />
                {exported === 'csv' ? 'Downloaded ✓' : 'CSV'}
              </button>
            </div>
          </div>

          {/* ── Purge ───────────────────────────────────────────────────── */}
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Purge &amp; Reset <span className="normal-case font-normal">(GDPR Art. 17)</span>
            </p>
            {!confirmPurge ? (
              <button
                type="button"
                onClick={handlePurge}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 py-2 text-[10px] font-semibold transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Purge &amp; Reset Session
              </button>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] text-red-600 font-medium text-center">
                  This permanently wipes your saved session. Cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePurge}
                    className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2 text-[10px] font-semibold transition-colors"
                  >
                    Yes, Purge Everything
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmPurge(false)}
                    className="flex-1 rounded-lg border border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50 py-2 text-[10px] font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
