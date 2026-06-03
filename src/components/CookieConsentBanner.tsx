'use client';

import { useState, useEffect } from 'react';
import { hasConsent, recordConsent } from '@/lib/secureStorage';
import { ShieldCheck, X } from 'lucide-react';

/**
 * GDPR-compliant session-cookie notice.
 * Shown once per browser until the user accepts; stored in localStorage.
 * Since no analytics, advertising, or server-side tracking exists in this app,
 * the only "cookie" is the encrypted local session vault.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't consented yet in this browser
    if (!hasConsent()) setVisible(true);
  }, []);

  const accept = () => {
    recordConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie & privacy notice"
      className={[
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-[#111827] text-white',
        'px-4 py-3 shadow-[0_-2px_16px_rgba(0,0,0,0.25)]',
        'flex flex-col sm:flex-row items-start sm:items-center gap-3',
      ].join(' ')}
    >
      {/* Icon */}
      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />

      {/* Text */}
      <p className="text-[11px] leading-relaxed text-slate-300 flex-1">
        <span className="font-semibold text-white">Your privacy is protected. </span>
        All simulation computations are performed{' '}
        <span className="text-emerald-400 font-medium">
          entirely within your browser
        </span>
        . No personal data, financial inputs, or portfolio configurations are
        transmitted to any external server. A single encrypted key is stored
        locally to restore your session between visits — no tracking, no analytics,
        no advertising cookies.{' '}
        <a
          href="#privacy"
          className="underline underline-offset-2 text-slate-300 hover:text-white transition-colors"
        >
          Privacy policy ↗
        </a>
      </p>

      {/* Accept button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={accept}
          className="rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors px-4 py-1.5 text-[11px] font-semibold text-white whitespace-nowrap"
        >
          Accept &amp; Continue
        </button>
        <button
          type="button"
          onClick={accept}
          aria-label="Dismiss"
          className="text-slate-400 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
