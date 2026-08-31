/* GEI PayPal API handlers.
   Deploy these handlers on a Node/serverless platform and route:
     POST /api/paypal/create-order
     POST /api/paypal/capture-order
     GET  /api/paypal/entitlements
     GET  /api/paypal/health
     POST /api/paypal/webhook

   This module deliberately keeps entitlement storage behind a tiny adapter.
   Configure a real database/provider in production; never trust localStorage. */
const products = require('./products');
const paypal = require('./paypal-client');

const memoryEntitlements = new Map();
const captures = new Map();

function normalizeName(value) {
  return String(value || '').trim().slice(0, 80);
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getProduct(productId) {
  return products[String(productId || '')] || null;
}

function addEntitlement(playerName, product) {
  const key = playerName.toLowerCase();
  const current = memoryEntitlements.get(key) || [];
  if (!current.some((e) => e.entitlement === product.entitlement)) {
    current.push({
      productId: product.id,
      entitlement: product.entitlement,
      grantedAt: new Date().toISOString()
    });
    memoryEntitlements.set(key, current);
  }
  return current;
}

async function createOrder(req, res) {
  const product = getProduct(req.body?.productId);
  const playerName = normalizeName(req.body?.playerName);
  if (!product) return send(res, 400, { ok: false, error: 'unknown-product' });
  if (!playerName) return send(res, 400, { ok: false, error: 'player-name-required' });

  try {
    const order = await paypal.createOrder(product, playerName);
    captures.set(order.id, { productId: product.id, playerName, status: 'CREATED' });
    return send(res, 200, { ok: true, orderID: order.id });
  } catch (error) {
    console.error('[GEI PayPal create-order]', error.message);
    return send(res, 502, { ok: false, error: 'paypal-create-failed' });
  }
}

async function captureOrder(req, res) {
  const orderId = String(req.body?.orderID || '').trim();
  const expectedProductId = String(req.body?.productId || '').trim();
  const playerName = normalizeName(req.body?.playerName);
  if (!orderId || !expectedProductId || !playerName) {
    return send(res, 400, { ok: false, error: 'order-product-player-required' });
  }

  const product = getProduct(expectedProductId);
  if (!product) return send(res, 400, { ok: false, error: 'unknown-product' });

  try {
    const current = await paypal.getOrder(orderId);
    const unit = current?.purchase_units?.[0];
    const capturedProductId = unit?.custom_id;
    const capturedAmount = unit?.amount?.value;
    const capturedCurrency = unit?.amount?.currency_code;
    if (capturedProductId !== product.id || capturedAmount !== product.price || capturedCurrency !== product.currency) {
      return send(res, 409, { ok: false, error: 'order-does-not-match-product' });
    }

    const result = await paypal.captureOrder(orderId);
    const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED') {
      return send(res, 402, { ok: false, error: 'capture-not-completed', status: capture?.status || result?.status });
    }

    const prior = captures.get(orderId);
    if (prior?.status === 'COMPLETED') {
      return send(res, 200, { ok: true, status: 'COMPLETED', entitlements: addEntitlement(playerName, product) });
    }

    captures.set(orderId, { productId: product.id, playerName, status: 'COMPLETED', captureId: capture.id });
    const entitlement = { productId: product.id, entitlement: product.entitlement, grantedAt: new Date().toISOString(), paypalOrderId: orderId, paypalCaptureId: capture.id };
    const entitlements = addEntitlement(playerName, product);
    /* Replace the simple in-memory record with the richer audit object. */
    const key = playerName.toLowerCase();
    const stored = memoryEntitlements.get(key) || [];
    const existing = stored.find((e) => e.productId === product.id);
    if (existing) Object.assign(existing, entitlement);
    else stored.push(entitlement);
    memoryEntitlements.set(key, stored);

    return send(res, 200, { ok: true, status: 'COMPLETED', entitlement, entitlements });
  } catch (error) {
    console.error('[GEI PayPal capture-order]', error.message);
    return send(res, 502, { ok: false, error: 'paypal-capture-failed' });
  }
}

function getEntitlements(req, res) {
  const playerName = normalizeName(req.query?.player);
  if (!playerName) return send(res, 400, { ok: false, error: 'player-required' });
  return send(res, 200, { ok: true, entitlements: memoryEntitlements.get(playerName.toLowerCase()) || [] });
}

function health(_req, res) {
  send(res, 200, {
    ok: true,
    service: 'GEI PayPal Commerce',
    version: process.env.GEI_PAYPAL_VERSION || '0.1.0',
    environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox',
    checkoutReady: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    webhookReady: Boolean(process.env.PAYPAL_WEBHOOK_ID)
  });
}

async function webhook(req, res) {
  try {
    const verified = await paypal.verifyWebhook(req.headers, req.body);
    if (!verified) return send(res, 400, { ok: false, error: 'webhook-not-verified' });

    if (req.body?.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = req.body.resource || {};
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      if (orderId && !captures.has(orderId)) {
        captures.set(orderId, { status: 'WEBHOOK_COMPLETED', captureId: resource.id });
      }
    }
    return send(res, 200, { ok: true, received: true });
  } catch (error) {
    console.error('[GEI PayPal webhook]', error.message);
    return send(res, 400, { ok: false, error: 'webhook-verification-failed' });
  }
}

module.exports = { createOrder, captureOrder, getEntitlements, health, webhook };
