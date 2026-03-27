import { AlertTriangle, KeyRound, ShieldCheck, Copy, Check } from 'lucide-react'
import { useState } from 'react'

/**
 * This component renders a UI for 2FA setup with client-side TOTP QR code generation.
 * Generates TOTP secrets, displays QR codes, and manages backup codes.
 *
 * @param {{
 * enabled: boolean,
 * loading: boolean,
 * qrCodeUrl: string,
 * totpSecret: string,
 * backupCodes: string[],
 * onEnable: ()=>Promise<void>,
 * onDisable: ()=>Promise<void>
 * }} props
 */
export default function TwoFASetup({
  enabled,
  loading,
  qrCodeUrl,
  totpSecret,
  backupCodes,
  onEnable,
  onDisable,
}) {
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false)

  const copyToClipboard = (text, setter) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }
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
        <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 px-3 py-2 text-xs inline-flex gap-2 items-start">
          <ShieldCheck size={14} className="mt-0.5" />
          Enable 2FA to secure your account with an authenticator app.
        </div>
      )}

      {enabled && (
        <div className="mt-3 space-y-4">
          <div className="rounded-md border border-parchment-200 dark:border-dark-border p-4 bg-parchment-50 dark:bg-dark-bg">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-dark-muted mb-2">
              Step 1: Scan QR Code
            </p>
            {qrCodeUrl ? (
              <div className="flex flex-col gap-3">
                <img
                  src={qrCodeUrl}
                  alt="2FA QR code"
                  className="w-48 h-48 rounded-md border border-parchment-200 dark:border-dark-border mx-auto"
                />
                <p className="text-xs text-ink-muted dark:text-dark-muted">
                  Scan with Authenticator (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                </p>
              </div>
            ) : (
              <p className="text-xs text-ink-muted dark:text-dark-muted">Generating QR code...</p>
            )}
          </div>

          <div className="rounded-md border border-parchment-200 dark:border-dark-border p-4 bg-parchment-50 dark:bg-dark-bg">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-dark-muted mb-2">
              Step 2: Or Enter Manually
            </p>
            {totpSecret ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <code className="flex-1 text-xs font-mono bg-white dark:bg-dark-surface border border-parchment-200 dark:border-dark-border rounded px-2 py-1.5 text-ink dark:text-dark-text break-all">
                    {totpSecret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(totpSecret, setCopiedSecret)}
                    className="p-1.5 rounded text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover"
                    title="Copy secret"
                  >
                    {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-ink-muted dark:text-dark-muted">
                  Enter this key in your authenticator if scanning fails
                </p>
              </div>
            ) : (
              <p className="text-xs text-ink-muted dark:text-dark-muted">Secret key is not yet available</p>
            )}
          </div>

          <div className="rounded-md border border-parchment-200 dark:border-dark-border p-4 bg-parchment-50 dark:bg-dark-bg">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted dark:text-dark-muted inline-flex items-center gap-1 mb-2">
              <KeyRound size={12} /> Backup Codes
            </p>
            <p className="text-xs text-ink-muted dark:text-dark-muted mb-2">
              Save these codes in a safe place. Use one if you lose access to your authenticator.
            </p>
            {backupCodes.length === 0 ? (
              <p className="text-xs text-ink-muted dark:text-dark-muted">No backup codes generated yet.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code) => (
                    <span
                      key={code}
                      className="font-mono text-xs rounded border border-parchment-200 dark:border-dark-border px-2 py-1.5 bg-white dark:bg-dark-surface text-ink dark:text-dark-text"
                    >
                      {code}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(backupCodes.join('\n'), setCopiedBackupCodes)
                  }
                  className="mt-2 px-2 py-1 text-xs rounded border border-parchment-200 dark:border-dark-border text-ink-muted dark:text-dark-muted hover:bg-parchment-100 dark:hover:bg-dark-hover flex items-center gap-1"
                >
                  {copiedBackupCodes ? (
                    <>
                      <Check size={12} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy All
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
