/* ============================================================
   GEI PAYPAL COMMERCE CLIENT
   ------------------------------------------------------------
   Browser-side checkout bridge for server-verified PayPal orders.
   Secrets NEVER belong in this file.

   Expected server API:
     POST /api/paypal/create-order  { productId, playerName }
       -> { orderID }
     POST /api/paypal/capture-order { orderID, productId, playerName }
       -> { ok, status, entitlement, entitlements? }
     GET  /api/paypal/entitlements?player=...
       -> { entitlements: [...] }

   Payment truth lives on the server. localStorage is only a cache/UI
   transport for the server-verified entitlement snapshot.
   ============================================================ */
(function () {
  'use strict';
  if (window.__GEI_PAYPAL__) return;
  window.__GEI_PAYPAL__ = true;

  var CONFIG = {
    createOrderUrl: '/api/paypal/create-order',
    captureOrderUrl: '/api/paypal/capture-order',
    entitlementsUrl: '/api/paypal/entitlements',
    currency: 'USD'
  };

  var PRODUCTS = [
    {
      id: 'discovery',
      name: 'GEI Discovery Pack',
      price: '10.00',
      description: 'Starter premium GEI content.'
    },
    {
      id: 'builder',
      name: 'GEI Builder Pack',
      price: '25.00',
      description: 'Expanded GEI builder content.'
    },
    {
      id: 'master-blueprint',
      name: 'GEI Master Blueprint',
      price: '69.00',
      description: 'Premium GEI blueprint access.'
    }
  ];

  function jsonFetch(url, options) {
    return fetch(url, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    }, options || {})).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        if (!r.ok) {
          var msg = body && body.error ? body.error : ('HTTP ' + r.status);
          throw new Error(msg);
        }
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
    } catch (e) {
      return { economy: { entitlements: [] } };
    }
  }

  function cacheEntitlements(entitlements) {
    var s = readState();
    s.economy.entitlements = Array.isArray(entitlements) ? entitlements : [];
    try { localStorage.setItem('gei-academy-state-v1', JSON.stringify(s)); } catch (e) {}
    return s.economy.entitlements;
  }

  function playerName() {
    var s = readState();
    return String(s.name || '').trim();
  }

  function product(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function hasEntitlement(id, snapshot) {
    var list = snapshot || readState().economy.entitlements;
    return Array.isArray(list) && list.some(function (e) {
      if (typeof e === 'string') return e === id;
      return e && (e.productId === id || e.product === id || e.id === id);
    });
  }

  function getEntitlements(name) {
    var n = String(name || playerName()).trim();
    if (!n) return Promise.resolve(cacheEntitlements([]));
    var url = CONFIG.entitlementsUrl + '?player=' + encodeURIComponent(n);
    return jsonFetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
      .then(function (data) {
        return cacheEntitlements(Array.isArray(data.entitlements) ? data.entitlements : []);
      });
  }

  function createOrder(productId) {
    var p = product(productId);
    if (!p) return Promise.reject(new Error('Unknown GEI product.'));
    return jsonFetch(CONFIG.createOrderUrl, {
      method: 'POST',
      body: JSON.stringify({
        productId: p.id,
        playerName: playerName()
      })
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
      body: JSON.stringify({
        orderID: orderID,
        productId: p.id,
        playerName: playerName()
      })
    }).then(function (data) {
      if (!data.ok) throw new Error(data.error || 'PayPal capture was not verified.');
      if (Array.isArray(data.entitlements)) cacheEntitlements(data.entitlements);
      else if (data.entitlement) {
        var current = readState().economy.entitlements.slice();
        current.push(data.entitlement);
        cacheEntitlements(current);
      }
      return data;
    });
  }

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
    playerName: playerName
  };
})();
