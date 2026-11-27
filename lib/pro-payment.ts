import { formatQrisIdr, QRIS_AMOUNT } from "@/lib/qris"

/** Week-1 launch: dynamic QRIS + WhatsApp until Midtrans/Xendit KYB clears. */

export const PRO_AMOUNT_IDR = QRIS_AMOUNT.PRO
export const SCAN_PACK_AMOUNT_IDR = QRIS_AMOUNT.SCAN_PACK
export const BOOKING_DEFAULT_AMOUNT_IDR = QRIS_AMOUNT.BOOKING_DEFAULT

export const PRO_PRICE_LABEL = "Rp 29k/mo"

/** Fallback static image if dynamic render fails (Pro / app QR). */
export const QRIS_IMAGE_SRC = "/QRIS.jpeg"

/** Cropped QR card from GoPay (fallback only; booking UI uses dynamic QR). */
export const BOOKING_QRIS_IMAGE_SRC = "/QRIS_JADE_QR.png"

// EDIT HERE — WhatsApp Pro, scan pack, coaching (aplikasi)
const WHATSAPP_APP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_PRO ?? "6285121341608"

// EDIT HERE — WhatsApp konfirmasi booking meja (terpisah)
const WHATSAPP_BOOKING_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_BOOKING ?? "628117962211"

const WHATSAPP_BOOKING_DISPLAY = "+62 811-7962-211"

function waAppUrl(text: string) {
  return `https://wa.me/${WHATSAPP_APP_NUMBER}?text=${encodeURIComponent(text)}`
}

function waBookingUrl(text: string) {
  return `https://wa.me/${WHATSAPP_BOOKING_NUMBER}?text=${encodeURIComponent(text)}`
}

export { WHATSAPP_BOOKING_DISPLAY }

export function whatsAppProConfirmUrl(
  accountName?: string,
  options?: { renew?: boolean },
) {
  const name = accountName?.trim() || "(isi nama akun)"
  const action = options?.renew ? "perpanjang Pro 30 hari" : "aktifkan Pro 30 hari"
  return waAppUrl(
    `Halo Jade Mahjong — saya sudah transfer Pro ${formatQrisIdr(PRO_AMOUNT_IDR)} via QRIS. Mohon ${action}. Nama akun: ${name}`,
  )
}

export function whatsAppBookingConfirmUrl(options: {
  accountName?: string
  meetTitle?: string
  amountIdr: number
}) {
  const name = options.accountName?.trim() || "(isi nama akun)"
  const meet = options.meetTitle?.trim() || "meja"
  return waBookingUrl(
    `Halo Jade Mahjong — saya sudah transfer booking ${formatQrisIdr(options.amountIdr)} via QRIS untuk ${meet}. Nama akun: ${name}`,
  )
}

export function whatsAppScanPackConfirmUrl(accountName?: string) {
  const name = accountName?.trim() || "(isi nama akun)"
  return waAppUrl(
    `Halo Jade Mahjong — saya sudah transfer Scan Pack ${formatQrisIdr(SCAN_PACK_AMOUNT_IDR)} via QRIS. Nama akun: ${name}`,
  )
}

export function whatsAppCoachingConfirmUrl(options: {
  accountName?: string
  sessionLabel?: string
}) {
  const name = options.accountName?.trim() || "(isi nama akun)"
  const session = options.sessionLabel?.trim() || "saved session"
  return waAppUrl(
    `Halo Jade Mahjong — saya mau book Hand Audit 45 menit. Akun: ${name}. Session: ${session}.`,
  )
}

export function whatsAppForgotPasswordUrl(emailOrName?: string) {
  const account = emailOrName?.trim() || "(isi email / nama akun)"
  return waAppUrl(
    `Halo Admin Jade Mahjong — saya lupa password akun saya. Mohon bantu reset password. Email/Akun: ${account}`,
  )
}
