/**
 * Shared Power BI embed helpers for PassGP (kajabi-embed.js + embed-test.html).
 * Opens the results page directly and applies the member_ID filter at embed time.
 */
(function (global) {
  'use strict';

  var LANDING_PAGE_RE = /access your results|enter.*email|welcome to|landing/i;

  function buildMemberFilter(memberId, table, column) {
    return {
      $schema: 'http://powerbi.com/product/schema#basic',
      target: {
        table: table || 'DIM_Student',
        column: column || 'member_ID',
      },
      operator: 'In',
      values: [String(memberId)],
    };
  }

  function resolvePageName(data) {
    return data.resultsPageName || global.PASSGP_PBI_RESULTS_PAGE || '';
  }

  function buildEmbedConfig(data) {
    var models = global['powerbi-client'].models;
    var filterMeta = data.rlsFilter || data.emailFilter || {};
    var table = filterMeta.table || 'DIM_Student';
    var column = filterMeta.column || 'member_ID';
    var filterValue = data.rlsUsername || data.memberId || data.memberEmail || '';
    var pageName = resolvePageName(data);
    var config = {
      type: 'report',
      tokenType: models.TokenType.Embed,
      accessToken: data.accessToken,
      embedUrl: data.embedUrl,
      id: data.reportId,
      settings: {
        panes: { filters: { expanded: false, visible: false } },
        background: models.BackgroundType.Transparent,
      },
    };

    if (filterValue) {
      config.filters = [buildMemberFilter(filterValue, table, column)];
    }

    if (pageName) {
      config.pageName = pageName;
    }

    return config;
  }

  function findResultsPage(pages) {
    if (!pages || !pages.length) return null;

    for (var i = 0; i < pages.length; i++) {
      var name = pages[i].displayName || '';
      if (!LANDING_PAGE_RE.test(name)) return pages[i];
    }

    return pages.length > 1 ? pages[1] : null;
  }

  function skipLandingPageOnce(report) {
    return report.getPages().then(function (pages) {
      var target = findResultsPage(pages);
      if (target) return target.setActive();
    });
  }

  function applyEmbedHeight(container) {
    var h = global.PASSGP_PBI_EMBED_HEIGHT || '900px';
    container.style.width = '100%';
    container.style.height = h;
    container.style.minHeight = h;
  }

  function embedPassgpReport(container, data) {
    var config = buildEmbedConfig(data);
    var pageName = resolvePageName(data);
    applyEmbedHeight(container);
    global.powerbi.reset(container);
    var report = global.powerbi.embed(container, config);
    var bootDone = false;

    report.on('loaded', function () {
      if (bootDone || pageName) return;
      bootDone = true;
      skipLandingPageOnce(report).catch(function () {});
    });

    return report;
  }

  global.PassgpPbiEmbed = {
    buildMemberFilter: buildMemberFilter,
    buildEmbedConfig: buildEmbedConfig,
    embedPassgpReport: embedPassgpReport,
  };
})(typeof window !== 'undefined' ? window : this);
