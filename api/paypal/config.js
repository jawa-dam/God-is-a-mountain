/* Browser-safe PayPal config endpoint helper.
   Expose only the public client ID and environment. Never return the secret. */
function config(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    environment: process.env.PAYPAL_ENVIRONMENT === 'live' ? 'live' : 'sandbox'
  }));
}

module.exports = config;
