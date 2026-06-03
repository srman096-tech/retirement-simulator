/**
 * GDPR-compliant client-side session vault.
 *
 * All computation in this application happens entirely within the browser.
 * No personal data is transmitted to any external server unless the user
 * explicitly triggers a cloud-save action. This module handles:
 *   - AES-encrypted persistence in browser localStorage (session restore)
 *   - JSON / CSV export (Right to Portability — Article 20)
 *   - Full local purge (Right to Be Forgotten — Article 17)
 *   - Cookie-consent flag storage
 */

import CryptoJS from 'crypto-js';
import { MasterSimulatorConfig, CURRENCY_SYMBOLS } from '@/types/workspace';

// ── Storage keys ───────────────────────────────────────────────────────────────
const VAULT_KEY   = 'apex_sim_vault';
const CONSENT_KEY = 'apex_gdpr_consent';
const VERSION_KEY = 'apex_vault_version';
const VAULT_VERSION = '1';

/**
 * Encryption key.  In a server-persisted variant this would be derived
 * server-side per user session. Here it is intentionally kept client-only
 * (data never leaves the browser), so the key protects against naive reads
 * of the raw localStorage dump and provides data organisation/integrity.
 */
const LOCAL_ENCRYPTION_KEY = 'apex-sim-local-key-v1';

// ── Core save / load / purge ───────────────────────────────────────────────────

/**
 * Encrypts and saves the full retirement workspace configuration to localStorage.
 */
export function saveSimulationState(stateData: object): void {
  if (typeof window === 'undefined') return;
  try {
    const ciphertext = CryptoJS.AES.encrypt(
      JSON.stringify(stateData),
      LOCAL_ENCRYPTION_KEY,
    ).toString();
    localStorage.setItem(VAULT_KEY, ciphertext);
    localStorage.setItem(VERSION_KEY, VAULT_VERSION);
  } catch (err) {
    console.error('[SecureStorage] Failed to save local session state:', err);
  }
}

/**
 * Decrypts and retrieves the retirement workspace configuration.
 * Returns null if no data exists or the vault is corrupt / stale.
 */
export function loadSimulationState(): object | null {
  if (typeof window === 'undefined') return null;
  try {
    const version = localStorage.getItem(VERSION_KEY);
    if (version !== VAULT_VERSION) return null; // stale vault — ignore

    const ciphertext = localStorage.getItem(VAULT_KEY);
    if (!ciphertext) return null;

    const bytes = CryptoJS.AES.decrypt(ciphertext, LOCAL_ENCRYPTION_KEY);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    if (!plaintext) return null;

    return JSON.parse(plaintext) as object;
  } catch (err) {
    console.error('[SecureStorage] Vault read error — resetting:', err);
    purgeLocalData(); // corrupt vault → wipe it cleanly
    return null;
  }
}

/**
 * GDPR Article 17 compliance — fully purges the user's local session trace.
 * Removes the encrypted vault, version tag, and clears sessionStorage.
 */
export function purgeLocalData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(VERSION_KEY);
  localStorage.removeItem(CONSENT_KEY);
  sessionStorage.clear();
}

// ── Consent management ────────────────────────────────────────────────────────

export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'accepted';
}

export function recordConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, 'accepted');
}

// ── Export helpers (Article 20 — Right to Portability) ────────────────────────

/** Trigger a browser download of the given text payload. */
function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Save the raw workspace config as a portable dataset file (no GDPR metadata).
 * This file can be re-imported via the Load Dataset control to restore parameters.
 */
export function saveDataset(config: MasterSimulatorConfig): void {
  downloadFile(
    `retirement-dataset-${config.clientName.replace(/\s+/g, '-').toLowerCase()}-${
      new Date().toISOString().slice(0, 10)
    }.json`,
    JSON.stringify({ schema_version: VAULT_VERSION, workspace: config }, null, 2),
    'application/json',
  );
}

/** Export the full workspace config as a machine-readable JSON file. */
export function exportAsJSON(config: MasterSimulatorConfig): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    gdprNotice:
      'This file contains your personally configured retirement simulation data. ' +
      'All values were generated and stored exclusively within your browser.',
    schema_version: VAULT_VERSION,
    workspace: config,
  };
  downloadFile(
    `retirement-profile-${config.clientName.replace(/\s+/g, '-').toLowerCase()}-${
      new Date().toISOString().slice(0, 10)
    }.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  );
}

/** Export the workspace as a human-readable CSV file. */
export function exportAsCSV(config: MasterSimulatorConfig): void {
  const sym = CURRENCY_SYMBOLS[config.baseCurrency] ?? '';
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const rows: string[][] = [];

  // Header
  rows.push(['APEX WEALTH — RETIREMENT WORKSPACE EXPORT']);
  rows.push(['Exported At', new Date().toISOString()]);
  rows.push([]);

  // Client info
  rows.push(['CLIENT PROFILE']);
  rows.push(['Client Name',     config.clientName]);
  rows.push(['Advisor Firm',    config.advisorFirmName]);
  rows.push(['Current Age',     String(config.currentAge)]);
  rows.push(['Retirement Age',  String(config.retirementAge)]);
  rows.push(['Life Expectancy', String(config.lifeExpectancy)]);
  rows.push([]);

  // Assumptions
  rows.push(['FINANCIAL ASSUMPTIONS']);
  rows.push(['Base Currency',         config.baseCurrency]);
  rows.push(['Bucket Strategy',       config.strategy]);
  rows.push(['Monthly Expenses',      `${sym}${config.monthlyExpensesNative.toLocaleString()}`]);
  rows.push(['Annual Expenses',       `${sym}${(config.monthlyExpensesNative * 12).toLocaleString()}`]);
  rows.push(['Inflation Rate',        pct(config.inflationRate)]);
  rows.push(['Cash Return Rate',      pct(config.cashReturnRate)]);
  rows.push(['Debt Return Rate',      pct(config.debtReturnRate)]);
  rows.push(['Equity Return Rate',    pct(config.equityReturnRate)]);
  rows.push(['B1 Replenish Target',   `${config.bucket1TargetYears} yrs`]);
  rows.push(['B2 Replenish Target',   `${config.bucket2TargetYears} yrs`]);
  rows.push([]);

  // Spending Smile
  rows.push(['SPENDING SMILE PROFILE']);
  rows.push(['Enabled',              config.spendingSmile.isEnabled ? 'Yes' : 'No']);
  rows.push(['P1 Duration (Go-Go)',   `${config.spendingSmile.phase1Duration} yrs`]);
  rows.push(['P1 Premium',            pct(config.spendingSmile.phase1Premium)]);
  rows.push(['P2 Duration (Slow-Go)', `${config.spendingSmile.phase2Duration} yrs`]);
  rows.push(['P2 Contraction',        pct(config.spendingSmile.phase2Contraction)]);
  rows.push(['P3 Escalator (No-Go)',  pct(config.spendingSmile.phase3Escalator)]);
  rows.push([]);

  // Assets
  rows.push(['ASSETS']);
  rows.push(['Name', 'Asset Class', 'Currency', 'Current Value']);
  for (const a of config.assets) {
    rows.push([
      a.displayName,
      a.assetClass,
      a.currency,
      a.currentValue.toLocaleString(),
    ]);
  }
  rows.push([]);

  // Milestones
  rows.push(['MILESTONES']);
  rows.push(['Description', 'Direction', 'Target Age', 'Currency', 'Amount']);
  for (const m of config.milestones) {
    rows.push([
      m.description,
      m.direction,
      String(m.targetAge),
      m.currency,
      m.amountRequired.toLocaleString(),
    ]);
  }
  rows.push([]);

  // Privacy notice
  rows.push(['GDPR NOTICE',
    'All data in this export was generated and processed exclusively within your browser. ' +
    'No personal data is stored on external servers.'
  ]);

  const csv = rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadFile(
    `retirement-profile-${config.clientName.replace(/\s+/g, '-').toLowerCase()}-${
      new Date().toISOString().slice(0, 10)
    }.csv`,
    csv,
    'text/csv;charset=utf-8;',
  );
}
