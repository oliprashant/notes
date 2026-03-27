import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react'

/**
 * This component renders a UI for 2FA setup. Firebase phone MFA is supported natively.
 * TOTP QR setup requires Identity Platform TOTP support and server-issued shared secrets.
 *
 * @param {{
 * enabled: boolean,
 * loading: boolean,
 * qrCodeUrl: string,
 * backupCodes: string[],
 * onEnable: ()=>Promise<void>,
 * onDisable: ()=>Promise<void>
 * }} props
 */
export default function TwoFASetup({
  enabled,
  loading,
  qrCodeUrl,
  backupCodes,
  onEnable,
  onDisable,
}) {
  return (
    <section className="rounded-xl border border-parchment-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-dark-text inline-flex items-center gap-2">
            <ShieldCheck size={14} />
            Two-factor authentication
          </h3>
          <p className="text-xs text-ink-muted dark:text-dark-muted mt-1">
            Use an authenticator app for stronger account security.
          </p>
        </div>

        <button
          type="button"
          onClick={enabled ? onDisable : onEnable}
          disabled={loading}
          className="px-3 py-2 rounded-md text-sm bg-sage text-white hover:bg-sage-light disabled:opacity-60"
        >
          {enabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {!enabled && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs inline-flex gap-2 items-start">
          <AlertTriangle size={14} className="mt-0.5" />
          Full TOTP setup requires Identity Platform and server support for secret generation.
        </div>
      )}

      {enabled && (
        <div className="mt-3 space-y-3">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="2FA QR code" className="w-40 h-40 rounded-md border border-parchment-200 dark:border-dark-border" />
          ) : (
            <p className="text-xs text-ink-muted dark:text-dark-muted">
              QR pending. If you use phone-based MFA, complete verification in the auth flow.
            </p>
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted dark:text-dark-muted inline-flex items-center gap-1">
              <KeyRound size={12} /> Backup codes
            </p>
            {backupCodes.length === 0 ? (
              <p className="text-xs text-ink-muted dark:text-dark-muted mt-1">No backup codes generated yet.</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <span
                    key={code}
                    className="font-mono text-xs rounded border border-parchment-200 dark:border-dark-border px-2 py-1 text-ink dark:text-dark-text"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
