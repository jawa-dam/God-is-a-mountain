/*
  Unified handler for platforms that map one serverless function to
  /api/paypal/* . Body parsing is expected to be provided by the host.
*/
const api = require('./index');
const config = require('./config');

function pathOnly(req) {
  return String(req.url || '').split('?')[0].replace(/\/$/, '') || '/';
}

module.exports = async function handler(req, res) {
  const path = pathOnly(req);
  if (req.method === 'GET' && path === '/api/paypal/config') return config(req, res);
  if (req.method === 'GET' && path === '/api/paypal/health') return api.health(req, res);
  if (req.method === 'GET' && path === '/api/paypal/entitlements') return api.getEntitlements(req, res);
  if (req.method === 'POST' && path === '/api/paypal/create-order') return api.createOrder(req, res);
  if (req.method === 'POST' && path === '/api/paypal/capture-order') return api.captureOrder(req, res);
  if (req.method === 'POST' && path === '/api/paypal/webhook') return api.webhook(req, res);
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ ok: false, error: 'not-found' }));
};
