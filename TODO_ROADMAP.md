# Jade Mahjong — Remaining Implementation Checklist

What is left to build from the **Business, IT & Monetization Plan** (ordered by priority from launch readiness to B2B scale).

---

## 1. Club Owner / Club Tier (Rp 350k / mo)
- [ ] **Self-Serve Club Tier Onboarding & Subscription**
  - Paid Club Owner role/plan (`Rp 350k/mo`) separate from the single global `ADMIN` role, with subscription status & expiry tracking.
- [ ] **Designated Host Devices (1–4 Devices)**
  - Allow a Club Owner to authorize 1–4 specific host/captain devices per club session for unlimited camera scanning (instead of only global `ADMIN` or single captain).
- [ ] **Club-Branded Win Cards & Portal**
  - Custom club logo/stamp on IG Story Win Cards & Session Newspapers for Club Tier accounts.
- [ ] **Host Tips / Club Content Upload**
  - Allow Club Owners to upload/post club-specific tips and announcements.
- [ ] **Partner Payouts & Automated Commission Settlement**
  - Monthly payout ledger/history (1st of month, Rp 100k minimum balance, net of gateway + 10% platform/AI fee) and 20% recurring B2B referral tracking.

---

## 2. Payments & B2C Monetization
- [ ] **Automated QRIS Payment Gateway (Midtrans / Xendit)**
  - Webhook integration to auto-activate **Pro (Rp 29k/mo)**, **Scan Packs (Rp 15k)**, **Seat Bookings**, and **Club Tier (Rp 350k/mo)** without manual WhatsApp + Admin approval.
- [ ] **Self-Serve Rp 15k Scan Pack Checkout & Personal Scan Quota**
  - Enforce the `3 scans / day` limit on individual Free players' own phones on `/scan` and add a 1-tap `+50 scans (no expiry)` QRIS purchase flow.
- [ ] **Auto-Waitlist Pro Bump**
  - Update waitlist promotion in `app/api/schedule/[id]/book/review/route.ts` so `PRO` members on the waitlist automatically jump ahead of `FREE` members when a seat opens (instead of pure FIFO).

---

## 3. Pro Engagement, Retention & Analytics
- [x] **Historical ELO Progression Graph**
  - Add a rating-over-time line chart on `/players/[id]` (currently only shows current rating number).
- [x] **Pre-Game Opponent Scouting Reports**
  - Let Pro players tap opponents' names before/at a table to view their Fan DNA, playstyle habits, and win-method ratios.
- [x] **Monthly Jade Wrapped Card**
  - Auto-generated 9:16 Instagram Story summary card (Total Wins, Biggest Hand, Best Rival) for Pro players at month-end.
- [x] **Hand Clinic Feed**
  - Feed where Pro players can submit tough lost hands from their Game Log for the Coaching Staff to review, and browse coach breakdowns.
- [x] **Certified Table Mentors Flow**
  - Application & approval flow for Platinum/Jade players to earn a `COACH` badge and host paid beginner Guided Tables.
- [x] **Streak & Milestone Push/In-App Notifications**
  - Automated milestone alerts (e.g., `"3 Wins in a Row"`, `"First 8-Point Hand"`, `"Promoted to Jade II"`).

---

## 4. AI Model & Storage Flywheel
- [ ] **Cloudflare R2 Image Storage**
  - Save confirmed/corrected scanned hand photos + final tile labels to R2 to build the labeled training dataset.
- [ ] **Custom YOLOv8 / YOLOv11 ONNX Tile Detector**
  - Train on 500–1,000 real club photos and run via `onnxruntime-web` or a lightweight worker to cut per-scan API cost near Rp 0 and work on weak Wi-Fi.

---

## 5. Phase 3 — B2B Venue OS (Rp 3–5jt Setup + Rp 1jt / mo)
- [ ] **Multi-Tenant White-Labeling**
  - Tenant model (`Club` / `Venue`) supporting custom domains (`play.venue.com`), logos, color themes, and custom house rules from one codebase.
- [ ] **Venue Operations Module**
  - Hourly table timer billing, F&B / chip settlement, and commercial parlor front-desk queue management.
