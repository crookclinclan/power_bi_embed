/**
 * Shared embed helpers for Kajabi (direct container or iframe child page).
 */
(function (global) {
  'use strict';

  var PBI_CDN = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.23.1/dist/powerbi.min.js';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (global.document.querySelector('script[src="' + src + '"]')) return resolve();
      var s = global.document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error('Failed to load script: ' + src));
      };
      global.document.head.appendChild(s);
    });
  }

  function showError(container, message) {
    container.innerHTML =
      '<div style="padding:24px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:12px;font-family:system-ui,sans-serif">' +
      '<strong>Analytics unavailable</strong><p style="margin:8px 0 0">' + message + '</p></div>';
  }

  function showLoading(container, message) {
    container.innerHTML =
      '<p style="font-family:system-ui,sans-serif;color:#64748b;padding:16px">' +
      (message || 'Loading your dashboard…') +
      '</p>';
  }

  async function renderSession(container, session, helpersBase) {
    var base = (helpersBase || '').replace(/\/$/, '') || '';
    showLoading(container);
    await loadScript(base + '/pbi-embed-helpers.js');
    await loadScript(PBI_CDN);
    if (!session.rlsUsername && !session.memberId) {
      throw new Error('Could not resolve member');
    }
    global.PassgpPbiEmbed.embedPassgpReport(container, session);
  }

  async function runEmbed(container, opts) {
    var apiBase = (opts.apiBase || '').replace(/\/$/, '');
    var apiKey = (opts.apiKey || '').trim();
    var memberId = (opts.memberId || '').trim();
    var email = (opts.email || '').trim();

    if (!apiBase) {
      showError(container, 'PASSGP_EMBED_API is not configured.');
      return;
    }

    if (!apiKey) {
      showError(container, 'PASSGP_EMBED_API_KEY is not configured.');
      return;
    }

    if (!memberId) {
      showError(container, 'Please log in to PassGP to view your analytics.');
      return;
    }

    showLoading(container);

    try {
      await loadScript(apiBase + '/sign-request.js');

      var payload = await global.PassgpSign.buildBody(memberId, apiKey);
      if (email) payload.email = email;

      var res = await fetch(apiBase + '/api/powerbi/embed-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      var data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load dashboard');

      await renderSession(container, data, apiBase);
    } catch (e) {
      showError(container, e.message || 'Something went wrong.');
    }
  }

  global.PassgpKajabiEmbed = {
    run: runEmbed,
    renderSession: renderSession,
    showLoading: showLoading,
    showError: showError,
  };
})(typeof window !== 'undefined' ? window : this);
