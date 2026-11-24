/**
 * EMVCo QRIS static → dynamic (Tag 54 amount + CRC16).
 * Money lands on GoPay Merchant; confirmation stays WhatsApp + admin until Midtrans/Xendit.
 */

// EDIT HERE — paste raw static QRIS from GoPay Merchant (scan QRIS.jpeg / Cetak QRIS)
export const STATIC_QRIS =
  "00020101021126610014COM.GO-JEK.WWW01189360091438039823980210G8039823980303UMI51440014ID.CO.QRIS.WWW0215ID10266439357560303UMI5204573253033605802ID5916Swakarsa Digital6014BANDAR LAMPUNG61053512862070703A01630405FA"

/** GoPay Merchant · Jade mahjong (booking meja) — from public/QRIS_JADE.jpeg */
export const BOOKING_STATIC_QRIS =
  "00020101021126610014COM.GO-JEK.WWW01189360091433879558720210G3879558720303UMI51440014ID.CO.QRIS.WWW0215ID10266466873880303UMI5204594553033605802ID5912Jade mahjong6014BANDAR LAMPUNG61053522362070703A01630492F6"

/** Catalog amounts (IDR, whole rupiah). */
export const QRIS_AMOUNT = {
  PRO: 29_000,
  SCAN_PACK: 15_000,
  BOOKING_DEFAULT: 50_000,
} as const

function crc16(str: string): string {
  let crc = 0xffff
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc = crc << 1
      }
      crc &= 0xffff
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0")
}

/** Strip existing Tag 54 (transaction amount) if present. */
function stripAmountTag(payload: string): string {
  const match = payload.match(/54\d{2}/)
  if (!match || match.index == null) return payload
  const start = match.index
  const len = Number.parseInt(payload.slice(start + 2, start + 4), 10)
  if (!Number.isFinite(len) || len < 0) return payload
  return payload.slice(0, start) + payload.slice(start + 4 + len)
}

/**
 * Build a scan-ready dynamic QRIS string with a fixed IDR amount.
 * @param amount whole rupiah (e.g. 29000)
 */
export function generateDynamicQris(
  amount: number,
  staticQris = STATIC_QRIS,
): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("QRIS amount must be a positive number")
  }

  // 1. Drop old CRC hex (keep trailing 6304)
  let qris = staticQris.slice(0, -4)

  // 2. Static (010211) → Dynamic (010212)
  qris = qris.replace("010211", "010212")

  // 3. Replace any prior Tag 54, then insert before country Tag 58
  qris = stripAmountTag(qris)
  const amountStr = Math.floor(amount).toString()
  const amountTag = `54${amountStr.length.toString().padStart(2, "0")}${amountStr}`
  const parts = qris.split("5802ID")
  if (parts.length !== 2) {
    throw new Error("Format QRIS statis tidak valid (Tag 5802ID missing)")
  }

  const payloadWithoutCrc = `${parts[0]}${amountTag}5802ID${parts[1]}`

  // 4. Recalculate CRC16 over payload including 6304
  return payloadWithoutCrc + crc16(payloadWithoutCrc)
}

/** Dynamic QRIS for table booking — nominal terkunci di scan. */
export function generateBookingDynamicQris(amount: number) {
  return generateDynamicQris(amount, BOOKING_STATIC_QRIS)
}

export function formatQrisIdr(amount: number) {
  return `Rp ${Math.floor(amount).toLocaleString("id-ID")}`
}
