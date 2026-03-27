import QRCode from 'qrcode'
import { OTP } from 'otplib'

/**
 * Generate a random TOTP secret and return both secret and QR code
 * @param {string} accountName - Email or username for the account (shown in authenticator app)
 * @param {string} issuer - Issuer name (shown in authenticator app, e.g., "Noteflow")
 * @returns {Promise<{secret: string, qrCodeUrl: string}>}
 */
export async function generateTOTPSecret(accountName, issuer = 'Noteflow') {
  // Generate random secret
  const secret = OTP.generateSecret()

  // Build the otpauth URI (standard for authenticator apps)
  const otpauthUrl = OTP.keyuri(accountName, issuer, secret)

  // Generate QR code from URI
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 200,
    margin: 2,
  })

  return { secret, qrCodeUrl }
}

/**
 * Verify a TOTP token against a secret
 * @param {string} token - 6-digit token from authenticator app
 * @param {string} secret - Base32-encoded shared secret
 * @returns {boolean} True if token is valid
 */
export function verifyTOTPToken(token, secret) {
  try {
    return OTP.check(token, secret)
  } catch (err) {
    console.error('Error verifying TOTP token:', err)
    return false
  }
}

/**
 * Generate backup codes (8 codes, 8 characters each, uppercase alphanumeric)
 * @returns {string[]}
 */
export function generateBackupCodes(count = 8) {
  const codes = []
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    codes.push(code)
  }
  return codes
}

/**
 * Verify a backup code and return remaining codes
 * @param {string} code - Backup code to verify
 * @param {string[]} backupCodes - Array of remaining backup codes
 * @returns {{valid: boolean, remaining: string[]}}
 */
export function useBackupCode(code, backupCodes) {
  const normalizedCode = code.toUpperCase().replace(/\s/g, '')
  const index = backupCodes.findIndex(
    (c) => c.toUpperCase().replace(/\s/g, '') === normalizedCode
  )

  if (index === -1) {
    return { valid: false, remaining: backupCodes }
  }

  const remaining = backupCodes.filter((_, i) => i !== index)
  return { valid: true, remaining }
}
