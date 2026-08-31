# GEI Dam Academy — Release Notes
## Foundation Pass · 2026-08-30

Built from the approved full audit (`Claude audit.txt`) and the Master Production Build Prompt. Every change below was applied in controlled, anchored passes and verified with automated DOM tests.

---

### A. Bugs fixed (audit findings B1–B9 + new finding B10)

| # | Finding | Fix |
|---|---|---|
| **B1** | Two competing audio engines (dashboard had its own inline engine; levels loaded the shared one) | `index.html` now loads the canonical `js/gei-game-audio.js` with the same `gei-audio-canonical-bridge` as the level pages. Local `ac()/tone()/sound()` deleted. Dashboard events mapped to canonical kinds. |
| **B2** | Double audio-trigger layers per level (bindGEI + polish engine) → double sounds on ON, mute ignored | `bindGEI` layer **removed** from all 6 levels. One single mute-aware document listener per level now plays every mission event. Verified: ON = exactly one sound per event; OFF = zero sounds. |
| **B3** | Two parallel vaults; player-facing vault had no XP logic | `vault.html` is now the **one** canonical vault, built on `js/gei-vault-economy-engine.js` (900 XP per item, preview → confirm → deduct, ledger). Dashboard Vault tab routes to it; inline video modal deleted. |
| **B4** | Dashboard `DEFAULTS` missing `level6Tasks` → dashboard write **erased Level 6 progress** | `level6Tasks` added; `rewards`/`economy` schema added; `readState` deep-clones defaults. Regression-tested (a theme toggle on the dashboard no longer touches Level 6 tasks). |
| **B5** | Completion cards always showed `0 XP` / `0/6 DAYS` | `completeLevel()` now populates `#xpTotal` (total XP) and `#daysTotal` (completed levels) on all 6 levels. |
| **B6** | Level 6 used the ordinary completion card; button said "Next: Level 1" | Distinct **graduation** card: "🎉 GEI FOUNDATION COMPLETE / 🏆 MASTER BUILDER", animated gold treatment, all four unlocks listed, `🏆 ENTER THE VAULT → vault.html`. Level 6 NEXT tab → VAULT. Certificate identity snapshot written on completion (rename can't rewrite it). |
| **B7** | Locked levels rendered a blank page | Visible lock screen on levels 2–6: "🔒 LEVEL N LOCKED / Complete Level N-1 first" + back-to-previous-level button. |
| **B8** | Second localStorage key (sound preference) | **Left as-is** (pre-existing documented debt; folding it into canonical state is a future migration, per the audit). No new keys were introduced by this pass. |
| **B9** | Correct answer was always option A | Options shuffled at render time on every level; the correct answer keeps its logical identity (`data-j=0`). Verified: display position varies across loads; every question keeps exactly 3 distinct options. |
| **B10** (new) | Every level page had a literal `href="__PREV__"` placeholder (broken link) | Replaced with real previous-level links (Level 1 PREV → dashboard). |

### B. New canonical files

1. **`js/gei-game-audio.js`** — the one audio engine (Master Prompt §10–14)
2. **`js/gei-vault-economy-engine.js`** — canonical vault economy (§16–18, §20)
3. **`js/gei-skins.js`** — canonical skin system (§23)
4. **`js/gei-paypal.js`** — browser-side PayPal commerce bridge. Contains no secret; calls server endpoints and caches only server-returned entitlement snapshots in the existing `gei-academy-state-v1` object.
5. **`api/paypal/products.js`** — server-authoritative product catalog: Discovery $10, Builder $25, Master Blueprint $69.
6. **`api/paypal/paypal-client.js`** — server-only PayPal OAuth, order, capture, and webhook-signature verification client.
7. **`api/paypal/index.js`** — create-order, capture-order, entitlement, health, and webhook handlers.
8. **`api/paypal/config.js`** — browser-safe endpoint returning only public client ID + sandbox/live environment.
9. **`api/paypal/handler.js` / `routes.example.js`** — deployment routing examples.
10. **`api/paypal/.env.example`** and **`SECURITY.md`** — deployment/secrets guidance.

### C. PayPal integration boundary

- Existing XP vault rules remain unchanged: **900 XP = exactly one item**.
- PayPal purchases are separate from XP purchases.
- `economy.entitlements` remains reserved for **server-verified** purchase state.
- The browser never receives `PAYPAL_CLIENT_SECRET` or `PAYPAL_WEBHOOK_ID`.
- Server validates product ID, amount, and currency against the authoritative catalog before granting access.
- PayPal webhook signatures are verified through PayPal before accepted webhook events are processed.
- The frontend loads the PayPal JS SDK only after asking the server for the public client ID/environment.
- PayPal's current JavaScript SDK guidance recommends loading the SDK from PayPal and using the current SDK for new integrations. citeturn371109search0turn371109search10

### D. Important deployment limitation

The game is static-first. GitHub Pages can host the HTML/JS, but it cannot execute the Node handlers under `api/paypal/`.

The included server adapter stores captures and entitlements **in memory for development only**. It is intentionally not described as production-grade durable payment storage. Before Live money is accepted, replace that adapter with a persistent database and bind entitlements to an authenticated account/player ID rather than the editable display name.

### E. Verification status

**CODE STRUCTURE VERIFIED ✅** — PayPal files were added on branch `feature/paypal-commerce`; existing Academy economy engine remains intact.

**PAYPAL LIVE CHECKOUT VERIFIED ❌** — cannot be honestly marked complete until a deployed server has real PayPal Sandbox credentials, a reachable API endpoint, and an end-to-end Sandbox transaction/webhook test.

**DEVICE VERIFIED ❌** — physical Android/iPhone checkout behavior still needs a device pass.

**PRODUCTION PAYMENT STORAGE VERIFIED ❌** — persistent entitlement storage is still a required deployment step.

---

### F. Deployment checklist

1. Deploy `/api/paypal` to a Node/serverless host and route the `/api/paypal/*` endpoints.
2. Configure `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENVIRONMENT=sandbox`, and `GEI_PAYPAL_VERSION=0.1.0` as server environment variables.
3. Replace the development in-memory adapter with a persistent database.
4. Create/register the PayPal Sandbox webhook and test completed captures.
5. Test all three products and verify entitlement persistence after a server restart/redeploy.
6. Only then switch `PAYPAL_ENVIRONMENT=live` and perform a controlled real-money smoke test.
