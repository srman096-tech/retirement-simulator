'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Table2, Share2, FileDown, BookOpen } from 'lucide-react';
import { MasterSimulatorConfig } from '@/types/workspace';
import { SimulationResult } from '@/lib/simulation';

// ── Dynamically imported — @react-pdf/renderer uses browser-only APIs ──────────
const PDFExportButton = dynamic(() => import('./PDFExportButton'), {
  ssr: false,
  loading: ({ isLoading }) =>
    isLoading ? (
      // Skeleton placeholder while the react-pdf bundle hydrates
      <button
        disabled
        className="flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3 h-8 text-white opacity-60 cursor-default"
        style={{ backgroundColor: '#9ca3af' }}
      >
        <FileDown className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Export PDF</span>
      </button>
    ) : null,
});

interface NavbarProps {
  // Brand / identity
  advisorFirmName: string;
  advisorName: string;
  themePrimaryColor: string;
  // Client meta
  clientName: string;
  currentAge: number;
  baseCurrency: string;
  // Data-ledger toggle
  showDataLedger: boolean;
  onDataLedgerToggle: () => void;
  // Inline edit callbacks
  onAdvisorFirmNameChange: (name: string) => void;
  onAdvisorNameChange: (name: string) => void;
  onThemePrimaryColorChange: (color: string) => void;
  // PDF generation — full config + simulation results
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getFirmInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? 'A';
}

export default function Navbar({
  advisorFirmName,
  advisorName,
  themePrimaryColor,
  clientName,
  currentAge,
  baseCurrency,
  showDataLedger,
  onDataLedgerToggle,
  onAdvisorFirmNameChange,
  onAdvisorNameChange,
  onThemePrimaryColorChange,
  config,
  baseResult,
  crashResult,
}: NavbarProps) {
  const clientInitials = getInitials(clientName || 'Client User');
  const firmInitial    = getFirmInitial(advisorFirmName || 'A');

  return (
    <nav className="flex items-center justify-between px-6 py-0 h-[52px] border-b border-black/[0.08] bg-white shrink-0 z-20">

      {/* ── Left: Brand ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo square */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm select-none"
          style={{ backgroundColor: themePrimaryColor }}
        >
          {firmInitial}
        </div>

        {/* Firm name — editable */}
        <input
          type="text"
          value={advisorFirmName}
          onChange={e => onAdvisorFirmNameChange(e.target.value)}
          className="text-[13px] font-bold text-slate-800 bg-transparent border-none outline-none focus:ring-0 truncate max-w-[160px] cursor-text"
          aria-label="Advisor firm name"
        />

        {/* Separator */}
        <div className="w-px h-5 bg-black/[0.08] hidden md:block shrink-0" />

        {/* Relationship manager — editable */}
        <input
          type="text"
          value={advisorName}
          onChange={e => onAdvisorNameChange(e.target.value)}
          className="text-[12px] text-[#6b7280] bg-transparent border-none outline-none focus:ring-0 truncate max-w-[130px] cursor-text hidden md:block"
          placeholder="Advisor name"
          aria-label="Advisor / relationship manager name"
          title="Advisor / RM name (appears on PDF report)"
        />

        {/* Product label */}
        <div className="w-px h-5 bg-black/[0.08] hidden lg:block shrink-0" />
        <span className="text-[13px] text-[#9ca3af] hidden lg:block font-medium whitespace-nowrap select-none">
          Retirement Simulator
        </span>
      </div>

      {/* ── Right: Client info + actions ─────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Client pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#f6f7f9] border border-black/[0.08] mr-1">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 select-none"
            style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
          >
            {clientInitials}
          </div>
          <span className="text-[12px] font-medium text-[#111827] whitespace-nowrap">
            {clientName}
          </span>
          <span className="text-[11px] text-[#6b7280] whitespace-nowrap">
            · Age {currentAge} · {baseCurrency}
          </span>
        </div>

        {/* Tutorial link */}
        <Link
          href="/tutorial"
          className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3 h-8 border border-black/[0.08] text-[#6b7280] hover:bg-[#f6f7f9] transition-all"
          title="Open tutorial guide"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Tutorial
        </Link>

        {/* Data Ledger toggle */}
        <button
          onClick={onDataLedgerToggle}
          className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3 h-8 border transition-all"
          style={
            showDataLedger
              ? { borderColor: themePrimaryColor, color: themePrimaryColor, backgroundColor: `${themePrimaryColor}12` }
              : { borderColor: 'rgba(0,0,0,0.08)', color: '#6b7280', backgroundColor: 'transparent' }
          }
        >
          <Table2 className="w-3.5 h-3.5" />
          Data ledger
        </button>

        {/* Share */}
        <button
          onClick={() => navigator.clipboard?.writeText(window.location.href)}
          className="hidden sm:flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3 h-8 border border-black/[0.08] text-[#6b7280] hover:bg-[#f6f7f9] transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>

        {/* Export PDF — dynamically loaded, renders PDFDownloadLink */}
        <PDFExportButton
          config={config}
          baseResult={baseResult}
          crashResult={crashResult}
          primaryColor={themePrimaryColor}
        />

        {/* Colour picker — subtle swatch */}
        <input
          type="color"
          value={themePrimaryColor}
          onChange={e => onThemePrimaryColorChange(e.target.value)}
          className="w-7 h-7 rounded-md cursor-pointer border border-black/[0.08] p-0.5 bg-white"
          title="Brand colour"
        />
      </div>
    </nav>
  );
}
