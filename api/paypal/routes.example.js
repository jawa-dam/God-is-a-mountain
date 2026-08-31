/* Adapt this example to your deployment platform/router.
   The GitHub Pages/static frontend cannot execute these handlers by itself.
*/
const api = require('./index');
const config = require('./config');

module.exports = function route(req, res) {
  const path = req.url.split('?')[0];
  if (req.method === 'GET' && path === '/api/paypal/config') return config(req, res);
  if (req.method === 'GET' && path === '/api/paypal/health') return api.health(req, res);
  if (req.method === 'GET' && path === '/api/paypal/entitlements') return api.getEntitlements(req, res);
  if (req.method === 'POST' && path === '/api/paypal/create-order') return api.createOrder(req, res);
  if (req.method === 'POST' && path === '/api/paypal/capture-order') return api.captureOrder(req, res);
  if (req.method === 'POST' && path === '/api/paypal/webhook') return api.webhook(req, res);
  res.statusCode = 404;
  res.end('Not found');
};
