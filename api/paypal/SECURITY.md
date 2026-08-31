# PayPal security boundary

1. `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID` are server-only secrets. Never place them in HTML, JS shipped to browsers, Git, or client localStorage.
2. The public PayPal client ID may be exposed to the browser.
3. The server, not the browser, owns product prices and grants entitlements only after PayPal confirms a completed capture.
4. Production identity must use an authenticated account/player ID. A display name is not a secure identity.
5. Replace the included in-memory adapter with a durable database before enabling live payments.
6. Configure the webhook URL in PayPal Developer Dashboard and verify webhook signatures before processing events.
7. Start in Sandbox. Switch to Live only after successful end-to-end testing.
