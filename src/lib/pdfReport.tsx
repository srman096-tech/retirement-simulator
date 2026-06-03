/**
 * Professional Retirement Planning PDF Report
 * Rendered entirely client-side with @react-pdf/renderer v4.
 * Design benchmark: institutional wealth-management reports (JPMC / Accenture quality).
 */

import React from 'react';
import {
  Document, Page, View, Text, StyleSheet, Svg,
  Line, Rect, Polyline, G, Font,
} from '@react-pdf/renderer';
import { MasterSimulatorConfig, CURRENCY_SYMBOLS, SupportedCurrency } from '@/types/workspace';
import { SimulationResult, SimulationDataPoint } from '@/lib/simulation';

// ── Typography helpers ─────────────────────────────────────────────────────────
Font.registerHyphenationCallback(word => [word]);

// ── Formatting ─────────────────────────────────────────────────────────────────
function fmtShort(v: number, currency: SupportedCurrency): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? '';
  const abs = Math.abs(v);
  if (currency === 'INR') {
    if (abs >= 10_000_000) return `${sym}${(v / 10_000_000).toFixed(2)}Cr`;
    if (abs >= 100_000)    return `${sym}${(v / 100_000).toFixed(2)}L`;
    return `${sym}${Math.round(v).toLocaleString()}`;
  }
  if (abs >= 1_000_000_000) return `${sym}${(v / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000)     return `${sym}${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)         return `${sym}${(v / 1_000).toFixed(1)}K`;
  return `${sym}${Math.round(v).toLocaleString()}`;
}
function pct(v: number): string { return `${(v * 100).toFixed(1)}%`; }
function dateFmt(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const DARK   = '#0F172A';
const MUTED  = '#64748B';
const LIGHT  = '#F1F5F9';
const WHITE  = '#FFFFFF';
const BORDER = '#E2E8F0';
const GREEN  = '#059669';
const RED    = '#DC2626';
const AMBER  = '#D97706';

// ── StyleSheet ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Pages
  page: {
    fontFamily: 'Helvetica', fontSize: 8.5, color: DARK,
    backgroundColor: WHITE,
  },
  coverPage: { fontFamily: 'Helvetica', backgroundColor: WHITE },

  // Layout
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },
  flex1: { flex: 1 },
  pageBody: { paddingHorizontal: 36, paddingVertical: 28 },
  mb4:  { marginBottom: 4  },
  mb8:  { marginBottom: 8  },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },

  // Cover
  coverHeader: {
    paddingHorizontal: 40, paddingTop: 44, paddingBottom: 36,
  },
  coverDivider: { height: 2, marginBottom: 20 },
  coverTitle: {
    fontSize: 9, letterSpacing: 3, color: WHITE, marginBottom: 6,
    textTransform: 'uppercase',
  },
  coverClientName: {
    fontSize: 28, fontFamily: 'Helvetica-Bold', color: WHITE,
    lineHeight: 1.2, marginBottom: 4,
  },
  coverSubtitle: { fontSize: 11, color: WHITE, opacity: 0.72 },
  coverBody: { padding: 40 },
  coverMeta: {
    borderLeftWidth: 3, borderLeftColor: '#E2E8F0',
    paddingLeft: 14, marginBottom: 10,
  },
  coverMetaLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  coverMetaValue: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: DARK },
  confidential: {
    borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 3,
    alignSelf: 'flex-start',
  },
  confidentialText: { fontSize: 7.5, letterSpacing: 1.5, color: MUTED, textTransform: 'uppercase' },

  // Section header
  sectionHeader: {
    paddingHorizontal: 36, paddingVertical: 10,
    marginBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK },
  sectionPage:  { fontSize: 7.5, color: MUTED },

  // Page header strip
  pageHeaderStrip: {
    height: 4,
  },
  pageTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 36, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    marginBottom: 0,
  },
  pageTopBarFirm: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 0.5 },
  pageTopBarSection: { fontSize: 7.5, color: MUTED },

  // KPI cards
  kpiCard: {
    flex: 1, borderRadius: 4, padding: 12, marginRight: 8,
    borderWidth: 1, borderColor: BORDER,
  },
  kpiLabel:   { fontSize: 7, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  kpiValue:   { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  kpiCaption: { fontSize: 7.5, color: MUTED },
  kpiBadge:   {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2,
    marginTop: 4,
  },
  kpiBadgeText: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Tables
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  thead: { flexDirection: 'row', backgroundColor: DARK },
  thCell: {
    paddingVertical: 6, paddingHorizontal: 8,
    fontSize: 7, fontFamily: 'Helvetica-Bold', color: WHITE,
    letterSpacing: 0.5,
  },
  tbody: {},
  trEven: { flexDirection: 'row', backgroundColor: WHITE },
  trOdd:  { flexDirection: 'row', backgroundColor: '#F8FAFC' },
  tdCell: {
    paddingVertical: 5, paddingHorizontal: 8,
    fontSize: 7.5, color: DARK, borderTopWidth: 1, borderTopColor: BORDER,
  },
  tdRight: { textAlign: 'right' },
  tdMuted: { color: MUTED },

  // 2-column layout
  col2Left:  { width: '48%', marginRight: '4%' },
  col2Right: { width: '48%' },

  // Assumption row
  assumRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  assumLabel: { fontSize: 8, color: MUTED },
  assumValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },

  // Footer
  pageFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 36, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  footerText: { fontSize: 7, color: MUTED },

  // Status badges
  badgeGreen:  { backgroundColor: '#D1FAE5' },
  badgeRed:    { backgroundColor: '#FEE2E2' },
  badgeAmber:  { backgroundColor: '#FEF3C7' },
  badgeBlue:   { backgroundColor: '#DBEAFE' },
  textGreen:   { color: GREEN },
  textRed:     { color: RED },
  textAmber:   { color: AMBER },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

interface ReportProps {
  config: MasterSimulatorConfig;
  baseResult: SimulationResult;
  crashResult: SimulationResult;
}

function PageFooter({ firm, page, pageOf }: { firm: string; page: number; pageOf: number }) {
  return (
    <View style={S.pageFooter} fixed>
      <Text style={S.footerText}>
        {firm} · Retirement Planning Analysis · {dateFmt()}
      </Text>
      <Text style={S.footerText}>STRICTLY CONFIDENTIAL</Text>
      <Text style={S.footerText}>Page {page} of {pageOf}</Text>
    </View>
  );
}

function PageTopBar({ firm, section }: { firm: string; section: string }) {
  return (
    <View style={S.pageTopBar}>
      <Text style={S.pageTopBarFirm}>{firm.toUpperCase()}</Text>
      <Text style={S.pageTopBarSection}>{section}</Text>
    </View>
  );
}

function SectionDivider({ title, primary }: { title: string; primary: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 3, height: 14, backgroundColor: primary, borderRadius: 2 }} />
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>{title}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: BORDER, marginTop: 6 }} />
    </View>
  );
}

function AssumRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={S.assumRow}>
      <Text style={S.assumLabel}>{label}</Text>
      <Text style={S.assumValue}>{value}</Text>
    </View>
  );
}

// ── SVG Portfolio Chart ────────────────────────────────────────────────────────

function PortfolioChart({
  data, retirementAge, primaryColor, currency, width = 490, height = 165,
}: {
  data: SimulationDataPoint[];
  retirementAge: number;
  primaryColor: string;
  currency: SupportedCurrency;
  width?: number;
  height?: number;
}) {
  const padL = 58, padR = 8, padT = 12, padB = 22;
  const cW = width - padL - padR;
  const cH = height - padT - padB;

  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map(d => d.total), 1);
  const step   = Math.max(1, Math.floor(data.length / 60));
  const pts    = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const xOf = (d: SimulationDataPoint) => {
    const i = data.indexOf(d);
    return padL + (i / (data.length - 1)) * cW;
  };
  const yOf = (v: number) => padT + (1 - Math.max(0, v) / maxVal) * cH;

  // Build polyline points for each series
  const linePoints = pts.map(d => `${xOf(d).toFixed(1)},${yOf(d.total).toFixed(1)}`).join(' ');

  // Fill area under total line
  const fillPoints = [
    `${xOf(pts[0]).toFixed(1)},${(padT + cH).toFixed(1)}`,
    ...pts.map(d => `${xOf(d).toFixed(1)},${yOf(d.total).toFixed(1)}`),
    `${xOf(pts[pts.length - 1]).toFixed(1)},${(padT + cH).toFixed(1)}`,
  ].join(' ');

  // Retirement age annotation
  const retirePoint = data.find(d => d.age === retirementAge) ?? data[0];
  const retireX = xOf(retirePoint);

  // Y-axis tick values
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <Svg width={width} height={height}>
      {/* Chart background */}
      <Rect x={padL} y={padT} width={cW} height={cH} fill="#F8FAFC" />

      {/* Horizontal grid lines */}
      {yTicks.map(frac => {
        const y = yOf(frac * maxVal);
        return (
          <G key={frac}>
            <Line x1={padL} x2={padL + cW} y1={y} y2={y}
              stroke={frac === 0 ? BORDER : BORDER} strokeWidth={frac === 0 ? 1 : 0.5}
            />
          </G>
        );
      })}

      {/* Filled area */}
      <Polyline points={fillPoints} fill={`${primaryColor}22`} stroke="none" />

      {/* Retirement age vertical line */}
      <Line x1={retireX} x2={retireX} y1={padT} y2={padT + cH}
        stroke={MUTED} strokeWidth={1} strokeDasharray="3,2"
      />

      {/* Total portfolio line */}
      <Polyline points={linePoints} stroke={primaryColor} strokeWidth={2} fill="none" />

      {/* Y-axis labels */}
      {yTicks.filter(f => f > 0).map(frac => {
        const y = yOf(frac * maxVal);
        return (
          <G key={frac}>
            <Line x1={padL - 3} x2={padL} y1={y} y2={y} stroke={BORDER} strokeWidth={0.8} />
            <Text x={padL - 4} y={y + 2.5} style={{ fontSize: 6, fill: MUTED, textAnchor: 'end' }}>
              {fmtShort(frac * maxVal, currency)}
            </Text>
          </G>
        );
      })}

      {/* X-axis labels — show every ~5 ages */}
      {data.filter((d, i) => i === 0 || i === data.length - 1 || (d.age % 5 === 0))
        .map(d => {
          const x = xOf(d);
          return (
            <G key={d.age}>
              <Line x1={x} x2={x} y1={padT + cH} y2={padT + cH + 3} stroke={BORDER} strokeWidth={0.8} />
              <Text x={x} y={padT + cH + 9} style={{ fontSize: 6, fill: MUTED, textAnchor: 'middle' }}>
                {d.age}
              </Text>
            </G>
          );
        })
      }

      {/* Retire annotation */}
      <Rect x={retireX - 16} y={padT - 2} width={32} height={10} rx={2} fill={primaryColor} />
      <Text x={retireX} y={padT + 5} style={{ fontSize: 5.5, fill: WHITE, textAnchor: 'middle', fontFamily: 'Helvetica-Bold' }}>
        ▶ Retire {retirementAge}
      </Text>

      {/* Axes */}
      <Line x1={padL} x2={padL} y1={padT} y2={padT + cH} stroke={BORDER} strokeWidth={1} />
      <Line x1={padL} x2={padL + cW} y1={padT + cH} y2={padT + cH} stroke={BORDER} strokeWidth={1} />
    </Svg>
  );
}

// ── Asset Allocation Bar ───────────────────────────────────────────────────────

function AllocationBar({
  cashPct, debtPct, equityPct, width = 200, height = 12,
}: { cashPct: number; debtPct: number; equityPct: number; width?: number; height?: number }) {
  const cashW   = cashPct   * width;
  const debtW   = debtPct   * width;
  const equityW = equityPct * width;
  return (
    <Svg width={width} height={height}>
      <Rect x={0} y={0} width={cashW}         height={height} rx={2} fill="#2563EB" />
      <Rect x={cashW} y={0} width={debtW}      height={height} fill="#7C3AED" />
      <Rect x={cashW + debtW} y={0} width={equityW} height={height} rx={2} fill="#059669" />
    </Svg>
  );
}

// ── Data table helper ──────────────────────────────────────────────────────────

function PDFTable({
  headers, rows, colWidths,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  colWidths: string[];
}) {
  return (
    <View style={S.table}>
      {/* Header */}
      <View style={S.thead}>
        {headers.map((h, i) => (
          <View key={i} style={[S.thCell, { width: colWidths[i] }]}>
            <Text>{h}</Text>
          </View>
        ))}
      </View>
      {/* Rows */}
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 0 ? S.trEven : S.trOdd}>
          {row.map((cell, ci) => (
            <View key={ci} style={[S.tdCell, { width: colWidths[ci] }]}>
              {typeof cell === 'string'
                ? <Text style={ci > 0 ? [S.tdRight] : undefined}>{cell}</Text>
                : cell
              }
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ── PAGE 1 — Cover ─────────────────────────────────────────────────────────────

function CoverPage({ config, primary }: { config: MasterSimulatorConfig; primary: string }) {
  const { clientName, advisorName, advisorFirmName, currentAge, baseCurrency, retirementAge, lifeExpectancy } = config;
  const accYears = Math.max(0, retirementAge - currentAge);
  const ddYears  = Math.max(0, lifeExpectancy - retirementAge);

  return (
    <Page size="A4" style={S.coverPage}>
      {/* ── Dark header block ───────────────────── */}
      <View style={[S.coverHeader, { backgroundColor: DARK, minHeight: 310 }]}>

        {/* Firm brand row */}
        <View style={[S.row, { alignItems: 'center', marginBottom: 36 }]}>
          <View style={{
            width: 32, height: 32, borderRadius: 6,
            backgroundColor: primary,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 10,
          }}>
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: WHITE }}>
              {(advisorFirmName[0] ?? 'A').toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: WHITE }}>{advisorFirmName}</Text>
            <Text style={{ fontSize: 7.5, color: '#94A3B8', letterSpacing: 0.5 }}>WEALTH MANAGEMENT</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ borderWidth: 1, borderColor: '#334155', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 7, color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Strictly Confidential
            </Text>
          </View>
        </View>

        {/* Accent line */}
        <View style={{ height: 2, backgroundColor: primary, marginBottom: 24, width: 60 }} />

        {/* Report type label */}
        <Text style={S.coverTitle}>Retirement Planning Analysis</Text>

        {/* Client name — dominant element */}
        <Text style={S.coverClientName}>{clientName}</Text>
        <Text style={S.coverSubtitle}>Personalised Retirement Modelling Report</Text>

        {/* Timeline chips */}
        <View style={[S.row, { marginTop: 24, gap: 8 }]}>
          {[
            { label: 'Current Age', val: String(currentAge) },
            { label: 'Retirement', val: String(retirementAge) },
            { label: 'Life Exp.', val: String(lifeExpectancy) },
            { label: 'Currency', val: baseCurrency },
          ].map(chip => (
            <View key={chip.label} style={{
              paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 4, backgroundColor: '#1E293B',
              borderWidth: 1, borderColor: '#334155',
            }}>
              <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 2 }}>{chip.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE }}>{chip.val}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── White body ──────────────────────────── */}
      <View style={[S.coverBody, { flex: 1 }]}>

        {/* Prepared by / for */}
        <View style={[S.row, { marginBottom: 28 }]}>
          <View style={[S.coverMeta, { flex: 1, marginRight: 24 }]}>
            <Text style={S.coverMetaLabel}>Prepared For</Text>
            <Text style={S.coverMetaValue}>{clientName}</Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 1 }}>Age {currentAge} · {baseCurrency}</Text>
          </View>
          <View style={[S.coverMeta, { flex: 1, marginRight: 24 }]}>
            <Text style={S.coverMetaLabel}>Relationship Manager</Text>
            <Text style={S.coverMetaValue}>{advisorName}</Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 1 }}>{advisorFirmName}</Text>
          </View>
          <View style={[S.coverMeta, { flex: 1 }]}>
            <Text style={S.coverMetaLabel}>Report Date</Text>
            <Text style={S.coverMetaValue}>{dateFmt()}</Text>
          </View>
        </View>

        {/* Planning horizon visual */}
        <View style={{
          borderWidth: 1, borderColor: BORDER, borderRadius: 6,
          padding: 14, marginBottom: 24, backgroundColor: '#F8FAFC',
        }}>
          <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Planning Horizon
          </Text>
          <Svg width={430} height={18}>
            {/* Accumulation bar */}
            <Rect x={0} y={0} width={(accYears / (accYears + ddYears + 1)) * 430} height={18} rx={3} fill={primary} />
            {/* Drawdown bar */}
            <Rect
              x={(accYears / (accYears + ddYears + 1)) * 430}
              y={0}
              width={(ddYears / (accYears + ddYears + 1)) * 430}
              height={18}
              fill="#BFDBFE"
            />
          </Svg>
          <View style={[S.row, { marginTop: 5, justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 7, color: primary }}>
              {accYears > 0 ? `▲ ${accYears} yrs accumulation` : '◀ Retiring now'}
            </Text>
            <Text style={{ fontSize: 7, color: '#2563EB' }}>▼ {ddYears} yrs drawdown</Text>
          </View>
        </View>

        {/* What's inside */}
        <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 6, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          This Report Contains
        </Text>
        {[
          'Executive Summary & Key Findings',
          'Portfolio Planning Assumptions',
          '20-Year Projection & Trajectory Analysis',
          'Annual Expense & Spending Profile',
          'Capital Events & Milestone Schedule',
          config.bearCaseEnabled ? 'Stress Test & Bear Case Analysis' : null,
          'Regulatory Notices & Disclosures',
        ].filter(Boolean).map((item, i) => (
          <View key={i} style={[S.row, { marginBottom: 3, alignItems: 'center' }]}>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: primary, marginRight: 7 }} />
            <Text style={{ fontSize: 8, color: MUTED }}>{item}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

// ── PAGE 2 — Executive Summary ─────────────────────────────────────────────────

function ExecutiveSummaryPage({ config, baseResult, crashResult, primary }: ReportProps & { primary: string }) {
  const { lifeExpectancy, baseCurrency, bearCaseEnabled } = config;
  const active = bearCaseEnabled ? crashResult : baseResult;
  const currency = baseCurrency as SupportedCurrency;
  const isFunded = active.isFunded;
  const totalAssets = config.assets.reduce((s, a) => s + a.currentValue, 0);

  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: primary }]} />
      <PageTopBar firm={config.advisorFirmName} section="EXECUTIVE SUMMARY" />

      <View style={S.pageBody}>
        <View style={S.mb24}>
          <SectionDivider title="Key Findings" primary={primary} />

          {/* KPI cards */}
          <View style={[S.row, { marginBottom: 16 }]}>
            {/* Funded status */}
            <View style={[S.kpiCard, { borderLeftWidth: 3, borderLeftColor: isFunded ? GREEN : RED }]}>
              <Text style={S.kpiLabel}>Structural Health</Text>
              <Text style={[S.kpiValue, { color: isFunded ? GREEN : RED, fontSize: 14 }]}>
                {isFunded ? 'Fully Funded' : 'Shortfall Risk'}
              </Text>
              <Text style={S.kpiCaption}>
                {isFunded
                  ? `All obligations met through age ${lifeExpectancy}`
                  : `Portfolio exhausted before age ${lifeExpectancy}`}
              </Text>
              <View style={[S.kpiBadge, isFunded ? S.badgeGreen : S.badgeRed]}>
                <Text style={[S.kpiBadgeText, isFunded ? S.textGreen : S.textRed]}>
                  {isFunded ? '✓ Funded' : '✗ Shortfall'}
                </Text>
              </View>
            </View>

            {/* Capital Horizon */}
            <View style={[S.kpiCard, {
              borderLeftWidth: 3,
              borderLeftColor: (!active.exhaustionAge || active.exhaustionAge >= lifeExpectancy) ? '#2563EB' : RED,
            }]}>
              <Text style={S.kpiLabel}>Capital Horizon</Text>
              <Text style={[S.kpiValue, { fontSize: 20, color: DARK }]}>
                {(!active.exhaustionAge || active.exhaustionAge >= lifeExpectancy)
                  ? `Age ${lifeExpectancy}+`
                  : `Age ${active.exhaustionAge}`}
              </Text>
              <Text style={S.kpiCaption}>
                {(!active.exhaustionAge || active.exhaustionAge >= lifeExpectancy)
                  ? 'Outlasts life expectancy'
                  : `${lifeExpectancy - (active.exhaustionAge ?? lifeExpectancy)} yr shortfall vs target`}
              </Text>
            </View>

            {/* Terminal estate */}
            <View style={[S.kpiCard, {
              borderLeftWidth: 3,
              borderLeftColor: active.finalEstateValue > 0 ? '#7C3AED' : RED,
              marginRight: 0,
            }]}>
              <Text style={S.kpiLabel}>Terminal Estate Value</Text>
              <Text style={[S.kpiValue, { fontSize: 14, color: active.finalEstateValue > 0 ? '#7C3AED' : RED }]}>
                {active.finalEstateValue > 0 ? fmtShort(active.finalEstateValue, currency) : 'Depleted'}
              </Text>
              <Text style={S.kpiCaption}>
                Nominal · age {lifeExpectancy}
              </Text>
              {active.finalEstateValue > 0 && (
                <Text style={{ fontSize: 7, color: '#7C3AED', marginTop: 4 }}>
                  Real: {fmtShort(active.finalEstateValueReal, currency)} (today's ₹)
                </Text>
              )}
            </View>
          </View>

          {/* Summary narrative */}
          <View style={{
            padding: 14, backgroundColor: '#F8FAFC', borderRadius: 4,
            borderLeftWidth: 3, borderLeftColor: primary, marginBottom: 16,
          }}>
            <Text style={{ fontSize: 8.5, lineHeight: 1.6, color: DARK }}>
              {`This retirement plan covers ${lifeExpectancy - config.currentAge} years from age ${config.currentAge} to ${lifeExpectancy}, `}
              {`with ${Math.max(0, config.retirementAge - config.currentAge)} years of accumulation followed by `}
              {`${Math.max(0, lifeExpectancy - config.retirementAge)} years of drawdown. `}
              {`The plan is based on a ${config.strategy.replace('_', '-')} bucket strategy with `}
              {`${fmtShort(totalAssets, currency)} in current portfolio value. `}
              {bearCaseEnabled
                ? `Stress analysis is ACTIVE — results shown reflect ${config.bearMarketScenarios.filter(s => s.enabled).length} bear market scenario(s).`
                : 'Results reflect the base case (no bear market applied).'}
            </Text>
          </View>
        </View>

        {/* Portfolio snapshot */}
        <SectionDivider title="Portfolio Snapshot" primary={primary} />
        <View style={[S.row, S.mb16]}>
          <View style={[S.col2Left]}>
            <AssumRow label="Total Current Assets" value={fmtShort(totalAssets, currency)} />
            <AssumRow label="Monthly Drawdown Budget" value={fmtShort(config.monthlyExpensesNative, currency)} />
            <AssumRow label="Annual Drawdown Budget" value={fmtShort(config.monthlyExpensesNative * 12, currency)} />
            <AssumRow label="Inflation Rate" value={pct(config.inflationRate)} />
            <AssumRow label="Equity Return" value={pct(config.equityReturnRate)} />
          </View>
          <View style={S.col2Right}>
            <AssumRow label="Retirement Age" value={String(config.retirementAge)} />
            <AssumRow label="Life Expectancy" value={String(config.lifeExpectancy)} />
            <AssumRow label="Bucket Strategy" value={config.strategy.replace('_', '-')} />
            <AssumRow label="Base Currency" value={config.baseCurrency} />
            <AssumRow label="Stress Test Active" value={config.bearCaseEnabled ? 'Yes' : 'No'} />
          </View>
        </View>

        {/* Asset allocation */}
        <SectionDivider title="Asset Allocation" primary={primary} />
        {(() => {
          let cash = 0, debt = 0, equity = 0;
          for (const a of config.assets) {
            if (a.assetClass === 'Cash')   cash   += a.currentValue;
            if (a.assetClass === 'Debt')   debt   += a.currentValue;
            if (a.assetClass === 'Equity') equity += a.currentValue;
          }
          const total = cash + debt + equity || 1;
          return (
            <View>
              <View style={S.mb8}>
                <AllocationBar cashPct={cash/total} debtPct={debt/total} equityPct={equity/total} width={430} height={14} />
              </View>
              <View style={[S.row, { gap: 16 }]}>
                {[
                  { label: 'Cash / Liquid', val: fmtShort(cash, currency), pct_: pct(cash/total), color: '#2563EB' },
                  { label: 'Debt / Fixed Income', val: fmtShort(debt, currency), pct_: pct(debt/total), color: '#7C3AED' },
                  { label: 'Equity / Growth', val: fmtShort(equity, currency), pct_: pct(equity/total), color: '#059669' },
                ].map(item => (
                  <View key={item.label} style={[S.row, { alignItems: 'center', flex: 1 }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: item.color, marginRight: 6 }} />
                    <View>
                      <Text style={{ fontSize: 7, color: MUTED }}>{item.label}</Text>
                      <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK }}>
                        {item.val} ({item.pct_})
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}
      </View>
      <PageFooter firm={config.advisorFirmName} page={2} pageOf={7} />
    </Page>
  );
}

// ── PAGE 3 — Planning Assumptions ─────────────────────────────────────────────

function AssumptionsPage({ config, primary }: { config: MasterSimulatorConfig; primary: string }) {
  const currency = config.baseCurrency as SupportedCurrency;
  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: primary }]} />
      <PageTopBar firm={config.advisorFirmName} section="PLANNING ASSUMPTIONS" />
      <View style={S.pageBody}>

        <View style={[S.row, S.mb24]}>
          {/* Demographics */}
          <View style={S.col2Left}>
            <SectionDivider title="Demographics" primary={primary} />
            <AssumRow label="Client Name"      value={config.clientName} />
            <AssumRow label="Current Age"      value={String(config.currentAge)} />
            <AssumRow label="Retirement Age"   value={String(config.retirementAge)} />
            <AssumRow label="Life Expectancy"  value={String(config.lifeExpectancy)} />
            <AssumRow label="Accumulation Yrs" value={String(Math.max(0, config.retirementAge - config.currentAge))} />
            <AssumRow label="Drawdown Yrs"     value={String(Math.max(0, config.lifeExpectancy - config.retirementAge))} />
            <AssumRow label="Base Currency"    value={config.baseCurrency} />
            <AssumRow label="Bucket Strategy"  value={config.strategy.replace('_', '-')} />
          </View>

          {/* Financial parameters */}
          <View style={S.col2Right}>
            <SectionDivider title="Return Assumptions" primary={primary} />
            <AssumRow label="Inflation Rate"    value={pct(config.inflationRate)} />
            <AssumRow label="Cash Return"       value={pct(config.cashReturnRate)} />
            <AssumRow label="Debt Return"       value={pct(config.debtReturnRate)} />
            <AssumRow label="Equity Return"     value={pct(config.equityReturnRate)} />
            <AssumRow label="Real Equity Return" value={pct(config.equityReturnRate - config.inflationRate)} />
            <AssumRow label="Monthly Expenses"  value={fmtShort(config.monthlyExpensesNative, currency)} />
            <AssumRow label="Annual Expenses"   value={fmtShort(config.monthlyExpensesNative * 12, currency)} />
            {config.strategy !== '1_BUCKET' && (
              <AssumRow label="B1 Replenish Target" value={`${config.bucket1TargetYears} yrs of expenses`} />
            )}
            {config.strategy === '3_BUCKET' && (
              <AssumRow label="B2 Replenish Target" value={`${config.bucket2TargetYears} yrs of expenses`} />
            )}
          </View>
        </View>

        {/* Assets table */}
        <SectionDivider title="Asset Register" primary={primary} />
        <View style={S.mb16}>
          <PDFTable
            headers={['Asset Name', 'Class', 'Currency', 'Current Value']}
            colWidths={['45%', '18%', '12%', '25%']}
            rows={config.assets.map(a => [
              a.displayName,
              a.assetClass,
              a.currency,
              fmtShort(a.currentValue, a.currency as SupportedCurrency),
            ])}
          />
        </View>

        {/* Spending profile */}
        <SectionDivider title="Spending Profile" primary={primary} />
        <View style={[S.row]}>
          <View style={S.col2Left}>
            <AssumRow label="Model"     value={config.spendingSmile.isEnabled ? '3-Phase Parametric Smile' : 'Standard Full-CPI'} />
            {config.spendingSmile.isEnabled && (
              <>
                <AssumRow label="P1 (Go-Go) Duration"   value={`${config.spendingSmile.phase1Duration} yrs`} />
                <AssumRow label="P1 Premium above CPI"  value={pct(config.spendingSmile.phase1Premium)} />
                <AssumRow label="P2 (Slow-Go) Duration" value={`${config.spendingSmile.phase2Duration} yrs`} />
              </>
            )}
          </View>
          {config.spendingSmile.isEnabled && (
            <View style={S.col2Right}>
              <AssumRow label="P2 CPI Drag"            value={pct(config.spendingSmile.phase2Contraction)} />
              <AssumRow label="P3 (No-Go) Escalator"   value={pct(config.spendingSmile.phase3Escalator)} />
              <AssumRow label="Eff. P1 Growth Rate"    value={pct(config.inflationRate + config.spendingSmile.phase1Premium)} />
              <AssumRow label="Eff. P3 Growth Rate"    value={pct(config.inflationRate + config.spendingSmile.phase3Escalator)} />
            </View>
          )}
        </View>

        {/* Bear case */}
        {config.bearCaseEnabled && config.bearMarketScenarios.length > 0 && (
          <View style={S.mb16}>
            <SectionDivider title="Bear Market Scenarios" primary={primary} />
            <PDFTable
              headers={['Scenario', 'Crash Age', 'Drawdown', 'Recovery Y1', 'Recovery Y2', 'Debt Contagion']}
              colWidths={['28%', '12%', '12%', '13%', '13%', '22%']}
              rows={config.bearMarketScenarios.filter(s => s.enabled).map(s => [
                s.label,
                String(s.crashAge),
                pct(s.drawdownPct),
                pct(s.recovery1Pct),
                pct(s.recovery2Pct),
                pct(s.bucket2ContagionPct),
              ])}
            />
          </View>
        )}
      </View>
      <PageFooter firm={config.advisorFirmName} page={3} pageOf={7} />
    </Page>
  );
}

// ── PAGE 4 — Portfolio Trajectory ─────────────────────────────────────────────

function TrajectoryPage({ config, baseResult, crashResult, primary }: ReportProps & { primary: string }) {
  const { lifeExpectancy, baseCurrency, bearCaseEnabled, retirementAge } = config;
  const active = bearCaseEnabled ? crashResult : baseResult;
  const currency = baseCurrency as SupportedCurrency;

  // Select key data points for the table: retirement year + every 2 years post-retirement
  const tableRows = active.dataPoints.filter(d => {
    if (d.age === config.currentAge) return true;
    if (d.age === retirementAge)      return true;
    if (d.age >= retirementAge && (d.age - retirementAge) % 2 === 0) return true;
    if (d.age === lifeExpectancy)     return true;
    return false;
  }).slice(0, 22);

  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: primary }]} />
      <PageTopBar firm={config.advisorFirmName} section="PORTFOLIO TRAJECTORY" />
      <View style={S.pageBody}>

        <SectionDivider title={`Portfolio Trajectory — Base${bearCaseEnabled ? ' & Stress' : ''} Case`} primary={primary} />

        {/* Chart */}
        <View style={[S.mb16, { alignItems: 'center' }]}>
          <PortfolioChart
            data={active.dataPoints}
            retirementAge={retirementAge}
            primaryColor={primary}
            currency={currency}
          />
          <View style={[S.row, { gap: 12, marginTop: 6, justifyContent: 'center' }]}>
            <View style={[S.row, { alignItems: 'center', gap: 4 }]}>
              <Svg width={20} height={6}>
                <Line x1={0} y1={3} x2={20} y2={3} stroke={primary} strokeWidth={2} />
              </Svg>
              <Text style={{ fontSize: 7, color: MUTED }}>
                {bearCaseEnabled ? 'Stressed Portfolio' : 'Total Portfolio'}
              </Text>
            </View>
            <View style={[S.row, { alignItems: 'center', gap: 4 }]}>
              <Svg width={20} height={6}>
                <Line x1={0} y1={3} x2={20} y2={3} stroke={MUTED} strokeWidth={1} strokeDasharray="3,2" />
              </Svg>
              <Text style={{ fontSize: 7, color: MUTED }}>Retirement Age</Text>
            </View>
          </View>
        </View>

        {/* Base vs Stress comparison (if stress on) */}
        {bearCaseEnabled && (
          <View style={[S.row, S.mb12]}>
            {[
              { label: 'Base Case Estate', val: fmtShort(baseResult.finalEstateValue, currency), color: '#2563EB' },
              { label: 'Stressed Estate', val: fmtShort(crashResult.finalEstateValue, currency), color: RED },
              { label: 'Stress Impact', val: fmtShort(baseResult.finalEstateValue - crashResult.finalEstateValue, currency), color: AMBER },
            ].map(item => (
              <View key={item.label} style={[S.kpiCard, { borderTopWidth: 2, borderTopColor: item.color, flex: 1, borderLeftWidth: 0 }]}>
                <Text style={S.kpiLabel}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: item.color }}>{item.val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Data table */}
        <SectionDivider title="Year-by-Year Summary" primary={primary} />
        <PDFTable
          headers={['Age', 'Year', 'Cash (B1)', 'Debt (B2)', 'Equity (B3)', 'Total', 'Real Value', 'Ann. Expense']}
          colWidths={['8%', '8%', '12%', '12%', '13%', '14%', '14%', '19%']}
          rows={tableRows.map(d => [
            String(d.age),
            String(d.calendarYear),
            fmtShort(d.bucket1, currency),
            fmtShort(d.bucket2, currency),
            fmtShort(d.bucket3, currency),
            fmtShort(d.total, currency),
            fmtShort(d.realTotal, currency),
            d.annualExpense > 0 ? fmtShort(d.annualExpense, currency) : '—',
          ])}
        />
      </View>
      <PageFooter firm={config.advisorFirmName} page={4} pageOf={7} />
    </Page>
  );
}

// ── PAGE 5 — Expense Profile ───────────────────────────────────────────────────

function ExpensePage({ config, baseResult, primary }: { config: MasterSimulatorConfig; baseResult: SimulationResult; primary: string }) {
  const currency = config.baseCurrency as SupportedCurrency;
  const retireRows = baseResult.dataPoints.filter(d => d.age >= config.retirementAge && d.annualExpense > 0).slice(0, 20);

  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: primary }]} />
      <PageTopBar firm={config.advisorFirmName} section="EXPENSE & SPENDING PROFILE" />
      <View style={S.pageBody}>

        <SectionDivider title="Post-Retirement Expense Schedule" primary={primary} />
        <View style={S.mb16}>
          <PDFTable
            headers={['Age', 'Year', 'Annual Expense', 'Monthly Equiv.', 'Eff. Infl. Rate', 'Cumulative Spent']}
            colWidths={['10%', '10%', '18%', '18%', '16%', '28%']}
            rows={(() => {
              let cumulative = 0;
              return retireRows.map(d => {
                cumulative += d.annualExpense;
                return [
                  String(d.age),
                  String(d.calendarYear),
                  fmtShort(d.annualExpense, currency),
                  fmtShort(d.annualExpense / 12, currency),
                  pct(d.effectiveInflationRate),
                  fmtShort(cumulative, currency),
                ];
              });
            })()}
          />
        </View>

        {/* Milestones */}
        {config.milestones.length > 0 && (
          <>
            <SectionDivider title="Capital Events (Milestones)" primary={primary} />
            <View style={[S.row, S.mb16]}>
              {/* Outflows */}
              <View style={[S.col2Left]}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: RED, marginBottom: 6 }}>
                  Capital Outflows
                </Text>
                <PDFTable
                  headers={['Description', 'Age', 'Amount']}
                  colWidths={['55%', '15%', '30%']}
                  rows={config.milestones.filter(m => m.direction === 'outflow').map(m => [
                    m.description, String(m.targetAge), fmtShort(m.amountRequired, m.currency as SupportedCurrency),
                  ])}
                />
              </View>
              {/* Inflows */}
              <View style={S.col2Right}>
                <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 6 }}>
                  Capital Inflows
                </Text>
                <PDFTable
                  headers={['Description', 'Age', 'Amount']}
                  colWidths={['55%', '15%', '30%']}
                  rows={config.milestones.filter(m => m.direction === 'inflow').map(m => [
                    m.description, String(m.targetAge), fmtShort(m.amountRequired, m.currency as SupportedCurrency),
                  ])}
                />
              </View>
            </View>
          </>
        )}

        {/* Summary totals */}
        <View style={{
          backgroundColor: '#F8FAFC', borderRadius: 4, padding: 14,
          borderWidth: 1, borderColor: BORDER,
        }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Lifetime Financial Summary
          </Text>
          {(() => {
            const totalExpense = retireRows.reduce((s, d) => s + d.annualExpense, 0);
            const totalOutflows = config.milestones.filter(m => m.direction === 'outflow').reduce((s, m) => s + m.amountRequired, 0);
            const totalInflows  = config.milestones.filter(m => m.direction === 'inflow').reduce((s, m) => s + m.amountRequired, 0);
            const totalAssets = config.assets.reduce((s, a) => s + a.currentValue, 0);
            return (
              <View style={S.row}>
                <View style={S.col2Left}>
                  <AssumRow label="Total Starting Assets"   value={fmtShort(totalAssets, currency)} />
                  <AssumRow label="Est. Total Living Exp."  value={fmtShort(totalExpense, currency)} />
                  <AssumRow label="Total Milestone Outflows" value={fmtShort(totalOutflows, currency)} />
                </View>
                <View style={S.col2Right}>
                  <AssumRow label="Total Milestone Inflows" value={fmtShort(totalInflows, currency)} />
                  <AssumRow label="Terminal Estate (Nominal)" value={fmtShort(baseResult.finalEstateValue, currency)} />
                  <AssumRow label="Terminal Estate (Real)"    value={fmtShort(baseResult.finalEstateValueReal, currency)} />
                </View>
              </View>
            );
          })()}
        </View>
      </View>
      <PageFooter firm={config.advisorFirmName} page={5} pageOf={7} />
    </Page>
  );
}

// ── PAGE 6 — Stress Analysis ───────────────────────────────────────────────────

function StressPage({ config, baseResult, crashResult, primary }: ReportProps & { primary: string }) {
  const currency = config.baseCurrency as SupportedCurrency;
  const scenarios = config.bearMarketScenarios.filter(s => s.enabled);

  const baseRows   = baseResult.dataPoints.filter(d => d.age >= config.retirementAge).filter((_, i) => i % 3 === 0 || i < 3).slice(0, 14);
  const stressRows = crashResult.dataPoints.filter(d => d.age >= config.retirementAge).filter((_, i) => i % 3 === 0 || i < 3).slice(0, 14);

  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: RED }]} />
      <PageTopBar firm={config.advisorFirmName} section="STRESS TEST & RISK ANALYSIS" />
      <View style={S.pageBody}>

        {/* Risk disclaimer banner */}
        <View style={{
          backgroundColor: '#FEF2F2', borderRadius: 4, padding: 10,
          borderLeftWidth: 3, borderLeftColor: RED, marginBottom: 16,
        }}>
          <Text style={{ fontSize: 8, color: RED, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
            ⚠ Stress Analysis Active
          </Text>
          <Text style={{ fontSize: 7.5, color: '#7F1D1D', lineHeight: 1.5 }}>
            The following analysis models the impact of {scenarios.length} simultaneous bear market event(s)
            on the client portfolio. Bear case results represent a pessimistic but plausible scenario.
            Actual outcomes may vary materially from these projections.
          </Text>
        </View>

        {/* Scenario summary */}
        <SectionDivider title="Active Stress Scenarios" primary={RED} />
        <View style={S.mb16}>
          <PDFTable
            headers={['Scenario', 'Crash Age', 'Equity Drawdown', 'Recovery Y+1', 'Recovery Y+2', 'Debt Contagion']}
            colWidths={['28%', '12%', '15%', '15%', '15%', '15%']}
            rows={scenarios.map(s => [
              s.label, String(s.crashAge),
              pct(s.drawdownPct), pct(s.recovery1Pct),
              pct(s.recovery2Pct), pct(s.bucket2ContagionPct),
            ])}
          />
        </View>

        {/* Base vs Stress comparison */}
        <SectionDivider title="Base Case vs Stressed Portfolio" primary={RED} />
        <View style={[S.row, S.mb12]}>
          {[
            { label: 'Base Estate', val: baseResult.finalEstateValue, color: GREEN },
            { label: 'Stressed Estate', val: crashResult.finalEstateValue, color: RED },
            { label: 'Potential Impact', val: baseResult.finalEstateValue - crashResult.finalEstateValue, color: AMBER },
            { label: 'Base Funded', val: baseResult.isFunded ? 1 : 0, color: '#2563EB', isText: true, text: baseResult.isFunded ? 'Yes' : 'No' },
            { label: 'Stressed Funded', val: crashResult.isFunded ? 1 : 0, color: '#2563EB', isText: true, text: crashResult.isFunded ? 'Yes' : 'No' },
          ].map((item, i) => (
            <View key={i} style={[S.kpiCard, {
              borderTopWidth: 2, borderTopColor: item.color, flex: 1, borderLeftWidth: 0,
              marginRight: i === 4 ? 0 : 6,
            }]}>
              <Text style={[S.kpiLabel, { marginBottom: 4 }]}>{item.label}</Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: item.color }}>
                {'isText' in item && item.isText ? item.text : fmtShort(item.val as number, currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Side-by-side projection table */}
        <SectionDivider title="Portfolio Comparison Table" primary={RED} />
        <View style={S.table}>
          <View style={S.thead}>
            {['Age', 'Base Total', 'Base Estate', 'Stressed Total', 'Stressed Estate', 'Difference'].map((h, i) => (
              <View key={i} style={[S.thCell, { flex: 1 }]}>
                <Text>{h}</Text>
              </View>
            ))}
          </View>
          {baseRows.map((bd, ri) => {
            const sd = stressRows[ri];
            if (!sd) return null;
            const diff = bd.total - sd.total;
            return (
              <View key={ri} style={ri % 2 === 0 ? S.trEven : S.trOdd}>
                {[
                  String(bd.age),
                  fmtShort(bd.total, currency),
                  fmtShort(bd.realTotal, currency),
                  fmtShort(sd.total, currency),
                  fmtShort(sd.realTotal, currency),
                  (diff >= 0 ? '−' : '+') + fmtShort(Math.abs(diff), currency),
                ].map((cell, ci) => (
                  <View key={ci} style={[S.tdCell, { flex: 1 }]}>
                    <Text style={ci === 5 ? (diff >= 0 ? { color: RED, textAlign: 'right' } : { color: GREEN, textAlign: 'right' }) : { textAlign: 'right' }}>
                      {cell}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </View>
      <PageFooter firm={config.advisorFirmName} page={6} pageOf={7} />
    </Page>
  );
}

// ── PAGE 7 — Disclaimer ────────────────────────────────────────────────────────

function DisclaimerPage({ config, primary }: { config: MasterSimulatorConfig; primary: string }) {
  return (
    <Page size="A4" style={S.page}>
      <View style={[S.pageHeaderStrip, { backgroundColor: primary }]} />
      <PageTopBar firm={config.advisorFirmName} section="REGULATORY NOTICES & DISCLOSURES" />
      <View style={S.pageBody}>

        <SectionDivider title="Important Legal Notice" primary={primary} />
        {[
          {
            title: 'No Financial Advice',
            body: 'This report and all projections contained herein are produced by an automated mathematical calculation engine for educational and illustrative purposes only. Nothing in this document constitutes investment advice, financial planning advice, legal advice, tax advice, or a formal recommendation under any regulatory framework, including but not limited to SEBI, FCA, SEC, MAS, or ASIC regulations.',
          },
          {
            title: 'Hypothetical Projections',
            body: 'All portfolio trajectories, estate values, drawdown rates, and milestone analyses are based on user-configured parameters and mathematical compounding models. Past performance is not indicative of future results. Actual investment returns may be materially higher or lower than the assumptions used. Inflation may deviate substantially from projections.',
          },
          {
            title: 'Model Limitations',
            body: 'This simulation uses simplified bucket-strategy models and does not account for tax implications, transaction costs, product-specific fees, sequencing risk beyond the bear case scenarios, longevity risk beyond the specified life expectancy, currency devaluation, geopolitical events, or structural changes in capital markets.',
          },
          {
            title: 'Privacy & Data Protection (GDPR)',
            body: 'All computations in this report were performed exclusively within the client\'s browser. No personal data, financial parameters, or simulation results are transmitted to or stored on any external server. This report was generated locally on the user\'s device. Please handle this document in accordance with applicable data protection regulations and your firm\'s client confidentiality policies.',
          },
          {
            title: 'Professional Advice Recommended',
            body: 'Clients are strongly encouraged to consult with a qualified financial adviser, chartered accountant, and legal counsel before making any retirement planning, investment, or estate planning decisions. This tool is intended to supplement, not replace, professional financial guidance.',
          },
        ].map((item, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 3 }}>
              {i + 1}. {item.title}
            </Text>
            <Text style={{ fontSize: 7.5, color: MUTED, lineHeight: 1.65 }}>{item.body}</Text>
          </View>
        ))}

        {/* Sign-off */}
        <View style={{
          marginTop: 28, padding: 16, borderWidth: 1, borderColor: BORDER,
          borderRadius: 4, backgroundColor: '#F8FAFC',
        }}>
          <View style={[S.row, { justifyContent: 'space-between' }]}>
            <View>
              <Text style={{ fontSize: 8, color: MUTED, marginBottom: 3 }}>Prepared By</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>{config.advisorName}</Text>
              <Text style={{ fontSize: 8, color: MUTED }}>{config.advisorFirmName}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 8, color: MUTED, marginBottom: 3 }}>Report Date</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>{dateFmt()}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 8, color: MUTED, marginBottom: 3 }}>Prepared For</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK }}>{config.clientName}</Text>
              <Text style={{ fontSize: 8, color: MUTED }}>Age {config.currentAge} · {config.baseCurrency}</Text>
            </View>
          </View>
        </View>

      </View>
      <PageFooter firm={config.advisorFirmName} page={7} pageOf={7} />
    </Page>
  );
}

// ── Root document ──────────────────────────────────────────────────────────────

export function RetirementPDFDocument({ config, baseResult, crashResult }: ReportProps) {
  const primary = config.themePrimaryColor || '#1D9E75';

  return (
    <Document
      title={`Retirement Plan — ${config.clientName}`}
      author={config.advisorName}
      subject="Retirement Planning Analysis"
      creator={config.advisorFirmName}
      keywords="retirement, planning, simulation, wealth management"
    >
      <CoverPage config={config} primary={primary} />
      <ExecutiveSummaryPage config={config} baseResult={baseResult} crashResult={crashResult} primary={primary} />
      <AssumptionsPage config={config} primary={primary} />
      <TrajectoryPage config={config} baseResult={baseResult} crashResult={crashResult} primary={primary} />
      <ExpensePage config={config} baseResult={baseResult} primary={primary} />
      {config.bearCaseEnabled && (
        <StressPage config={config} baseResult={baseResult} crashResult={crashResult} primary={primary} />
      )}
      <DisclaimerPage config={config} primary={primary} />
    </Document>
  );
}
