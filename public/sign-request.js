(function (global) {
  'use strict';

  async function hmacSha256Hex(secret, message) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    var sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(sig))
      .map(function (b) {
        return b.toString(16).padStart(2, '0');
      })
      .join('');
  }

  global.PassgpSign = {
    buildBody: async function (memberId, apiKey) {
      var ts = Date.now();
      var sig = await hmacSha256Hex(apiKey, memberId + ':' + ts);
      return { memberId: memberId, ts: ts, sig: sig };
    },
  };
})(typeof window !== 'undefined' ? window : this);
