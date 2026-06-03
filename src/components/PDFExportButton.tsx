'use client';

/**
 * PDFExportButton — must be imported dynamically with { ssr: false } because
 * @react-pdf/renderer relies on browser APIs unavailable during SSR.
 */

import { PDFDownloadLink } from '@react-pdf/renderer';
import { RetirementPDFDocument } from '@/lib/pdfReport';
import { MasterSimulatorConfig } from '@/types/workspace';
import { SimulationResult } from '@/lib/simulation';
import { FileDown, Loader2 } from 'lucide-react';

interface Props {
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
  primaryColor: string;
}

export default function PDFExportButton({ config, baseResult, crashResult, primaryColor }: Props) {
  const fileName = `retirement-plan-${
    config.clientName.replace(/\s+/g, '-').toLowerCase()
  }-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={
        <RetirementPDFDocument
          config={config}
          baseResult={baseResult}
          crashResult={crashResult}
        />
      }
      fileName={fileName}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <span
          className="flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-3 h-8 text-white transition-all hover:opacity-90 cursor-pointer select-none"
          style={{ backgroundColor: primaryColor }}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            : <FileDown className="w-3.5 h-3.5 shrink-0" />
          }
          <span className="hidden sm:inline">{loading ? 'Building…' : 'Export PDF'}</span>
        </span>
      )}
    </PDFDownloadLink>
  );
}
