/* ============================================================
   GEI PAYPAL COMMERCE CLIENT
   ------------------------------------------------------------
   Browser-side checkout bridge for server-verified PayPal orders.
   Secrets NEVER belong in this file.

   Payment truth lives on the server. localStorage is only a cache/UI
   transport for the server-returned entitlement snapshot.
   ============================================================ */
(function () {
  'use strict';
  if (window.__GEI_PAYPAL__) return;
  window.__GEI_PAYPAL__ = true;

  var CONFIG = {
    createOrderUrl: '/api/paypal/create-order',
    captureOrderUrl: '/api/paypal/capture-order',
    entitlementsUrl: '/api/paypal/entitlements',
    configUrl: '/api/paypal/config',
    currency: 'USD'
  };

  var PRODUCTS = [
    { id: 'discovery', name: 'GEI Discovery Pack', price: '10.00', description: 'Starter premium GEI content.' },
    { id: 'builder', name: 'GEI Builder Pack', price: '25.00', description: 'Expanded GEI builder content.' },
    { id: 'master-blueprint', name: 'GEI Master Blueprint', price: '69.00', description: 'Premium GEI blueprint access.' }
  ];

  function jsonFetch(url, options) {
    return fetch(url, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    }, options || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) throw new Error(body && body.error ? body.error : ('HTTP ' + r.status));
        return body;
      });
    });
  }

  function readState() {
    try {
      var s = JSON.parse(localStorage.getItem('gei-academy-state-v1') || '{}');
      if (!s.economy || typeof s.economy !== 'object') s.economy = {};
      if (!Array.isArray(s.economy.entitlements)) s.economy.entitlements = [];
      return s;
    } catch (e) { return { economy: { entitlements: [] } }; }
  }

  function cacheEntitlements(entitlements) {
    var s = readState();
    s.economy.entitlements = Array.isArray(entitlements) ? entitlements : [];
    try { localStorage.setItem('gei-academy-state-v1', JSON.stringify(s)); } catch (e) {}
    return s.economy.entitlements;
  }

  function playerName() { return String(readState().name || '').trim(); }
  function product(id) { return PRODUCTS.find(function (p) { return p.id === id; }) || null; }
  function hasEntitlement(id, snapshot) {
    var list = snapshot || readState().economy.entitlements;
    return Array.isArray(list) && list.some(function (e) {
      return typeof e === 'string' ? e === id : e && (e.productId === id || e.product === id || e.id === id);
    });
  }

  function getEntitlements(name) {
    var n = String(name || playerName()).trim();
    if (!n) return Promise.resolve(cacheEntitlements([]));
    return jsonFetch(CONFIG.entitlementsUrl + '?player=' + encodeURIComponent(n), {
      method: 'GET', headers: { 'Accept': 'application/json' }
    }).then(function (data) { return cacheEntitlements(data.entitlements || []); });
  }

  function createOrder(productId) {
    var p = product(productId);
    if (!p) return Promise.reject(new Error('Unknown GEI product.'));
    return jsonFetch(CONFIG.createOrderUrl, {
      method: 'POST',
      body: JSON.stringify({ productId: p.id, playerName: playerName() })
    }).then(function (data) {
      if (!data.orderID) throw new Error('PayPal order was not created.');
      return data.orderID;
    });
  }

  function captureOrder(orderID, productId) {
    var p = product(productId);
    if (!p) return Promise.reject(new Error('Unknown GEI product.'));
    return jsonFetch(CONFIG.captureOrderUrl, {
      method: 'POST',
      body: JSON.stringify({ orderID: orderID, productId: p.id, playerName: playerName() })
    }).then(function (data) {
      if (!data.ok) throw new Error(data.error || 'PayPal capture was not verified.');
      return getEntitlements(playerName()).then(function (ents) {
        data.entitlements = ents;
        return data;
      });
    });
  }

  function browserConfig() { return jsonFetch(CONFIG.configUrl, { method: 'GET', headers: { 'Accept': 'application/json' } }); }
  function config() { return Object.assign({}, CONFIG); }
  function products() { return PRODUCTS.slice(); }

  window.GEI_PAYPAL = {
    CONFIG: config,
    PRODUCTS: products,
    product: product,
    hasEntitlement: hasEntitlement,
    getEntitlements: getEntitlements,
    createOrder: createOrder,
    captureOrder: captureOrder,
    browserConfig: browserConfig,
    playerName: playerName
  };
})();
