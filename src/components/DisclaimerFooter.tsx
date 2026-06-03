export default function DisclaimerFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-100 px-6 py-4 shrink-0" id="privacy">
      <p className="text-xs text-slate-500 text-center leading-relaxed max-w-5xl mx-auto">
        <span className="font-semibold text-slate-600">Regulatory Notice &amp; Disclosure: </span>
        This platform is an automated mathematical calculation engine designed for educational and illustrative purposes.
        All asset tracking projections generated are hypothetical models, derived from user-configured logic and static compound metrics,
        and do not constitute legal financial advice, tax consulting, or a formal investment suitability recommendation under regulatory supervision.
      </p>
      <p className="text-[10px] text-slate-400 text-center leading-relaxed max-w-5xl mx-auto mt-2">
        <span className="font-semibold text-slate-500">🔒 Privacy: </span>
        All computation is handled locally within your browser context.
        No personal data, financial inputs, or portfolio configurations are persistently harvested, transmitted to, or stored on any external server.
        A single AES-encrypted session key is written to browser localStorage solely to restore your workspace between visits.
        You may export your data (GDPR Art.&nbsp;20) or permanently purge your local session (GDPR Art.&nbsp;17) at any time via the Privacy &amp; Data panel.
      </p>
    </footer>
  );
}
