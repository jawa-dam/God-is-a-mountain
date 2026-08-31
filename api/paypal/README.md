# GEI PayPal Commerce

This directory adds a server-side PayPal Standard Checkout foundation for the GEI Dam Academy game.

## Routes

Route these paths to `api/paypal/index.js` in your Node/serverless host:

- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order`
- `GET /api/paypal/entitlements?player=...`
- `GET /api/paypal/health`
- `POST /api/paypal/webhook`

## Environment variables

```text
PAYPAL_CLIENT_ID=your_server_side_client_id
PAYPAL_CLIENT_SECRET=your_server_side_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_ENVIRONMENT=sandbox
GEI_PAYPAL_VERSION=0.1.0
```

Set `PAYPAL_ENVIRONMENT=live` only after Sandbox checkout and webhook testing have passed.

## Important production note

The demo adapter in `index.js` stores entitlements in process memory. That is intentionally obvious and **not** a durable production database. Replace `memoryEntitlements` and `captures` with a persistent database before going live so entitlements survive restarts, scale-out, and redeployments.

Do not commit `.env` files or PayPal client secrets to GitHub.

## PayPal webhook

Register your deployed webhook URL in PayPal Developer Dashboard and subscribe at minimum to `PAYMENT.CAPTURE.COMPLETED`. The handler verifies the event using PayPal's `verify-webhook-signature` endpoint before acting on it.

## Frontend

`js/gei-paypal.js` is safe to ship publicly. It contains no secret. It calls the server API to create/capture orders and caches only the server-returned entitlement snapshot in the existing `gei-academy-state-v1` object.
