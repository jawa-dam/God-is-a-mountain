# GEI PayPal Commerce

This directory adds a server-side PayPal Standard Checkout foundation for the GEI Dam Academy game.

## Added

- Browser-safe `js/gei-paypal.js` checkout bridge.
- Premium products: $10 Discovery, $25 Builder, $69 Master Blueprint.
- Server-side PayPal order creation and capture.
- Server-side amount/product validation.
- PayPal webhook signature verification.
- Browser-safe PayPal config endpoint.
- Health endpoint exposing `version`, `checkoutReady`, and `webhookReady`.
- Vault UI with PayPal buttons and server-verified entitlement display.

## Routes

Route these paths to the Node/serverless handlers:

- `POST /api/paypal/create-order`
- `POST /api/paypal/capture-order`
- `GET /api/paypal/entitlements?player=...`
- `GET /api/paypal/health`
- `POST /api/paypal/webhook`
- `GET /api/paypal/config`

## Static-hosting boundary

The game is static-first. GitHub Pages or another static host can serve the HTML and JS, but it cannot execute the Node handlers in this directory. Deploy `/api/paypal` to a serverless/Node host and route `/api/paypal/*` there, or connect these handlers to the existing GEI backend.

## Environment variables

```text
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENVIRONMENT=sandbox
GEI_PAYPAL_VERSION=0.1.0
```

Never commit the secret or `.env` files.

## Persistence requirement

`index.js` currently contains an intentionally obvious **development-only in-memory adapter** for captures and entitlements. Replace it with a persistent database before accepting live money so orders and entitlements survive restarts, scale-out, and redeployments.

For production, bind entitlements to an authenticated account/player ID instead of the editable Academy display name. Store at minimum product ID, PayPal order ID, capture ID, status, account ID, and timestamps, with unique constraints that prevent duplicate grants.

## PayPal dashboard

Create/configure the PayPal app in Developer Dashboard. Use Sandbox first. Register the deployed webhook URL and subscribe to payment capture completion events. Switch to Live only after checkout, capture, entitlement, webhook, and failure paths have been tested.
