/* GEI PayPal server client.
   Node 18+ compatible. Keep PAYPAL_CLIENT_SECRET server-side only. */
const BASE = Object.freeze({
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com'
});

function paypalBase() {
  return process.env.PAYPAL_ENVIRONMENT === 'live' ? BASE.live : BASE.sandbox;
}

async function accessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials are not configured.');

  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`PayPal OAuth failed (${response.status}).`);
  }
  return body.access_token;
}

async function paypalRequest(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(`${paypalBase()}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body?.details?.map((x) => x.description).filter(Boolean).join('; ');
    throw new Error(`PayPal API ${response.status}: ${detail || body?.message || 'request failed'}`);
  }
  return body;
}

async function createOrder(product, playerName) {
  return paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': `GEI-${product.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: product.id,
        description: product.description,
        amount: {
          currency_code: product.currency,
          value: product.price
        }
      }],
      application_context: {
        brand_name: 'GEI Dam Academy',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING'
      }
    })
  });
}

async function captureOrder(orderId) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: 'POST',
    headers: {
      'PayPal-Request-Id': `GEI-CAPTURE-${orderId}`
    },
    body: JSON.stringify({})
  });
}

async function getOrder(orderId) {
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`, { method: 'GET' });
}

async function verifyWebhook(headers, webhookEvent) {
  const payload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: webhookEvent
  };
  if (!payload.webhook_id) throw new Error('PAYPAL_WEBHOOK_ID is not configured.');
  const result = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return result.verification_status === 'SUCCESS';
}

module.exports = { paypalBase, createOrder, captureOrder, getOrder, verifyWebhook };
