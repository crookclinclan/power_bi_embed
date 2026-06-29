/**
 * Shared Power BI embed helpers for PassGP (kajabi-embed.js + embed-test.html).
 * Opens View My Results directly, hides page tabs, applies member_ID filter.
 */
(function (global) {
  'use strict';

  var LANDING_PAGE_RE = /access your results|enter.*email|welcome to|landing/i;
  var EXCLUDED_EMBED_PAGE_RE = /\bqa\b|admin|debug|internal/i;
  var RESULTS_PAGE_RE = /view my results|my results/i;

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

  function embedPaneSettings(models) {
    return {
      navContentPaneEnabled: false,
      layoutType: models.LayoutType.Custom,
      customLayout: {
        displayOption: models.DisplayOption.FitToWidth,
      },
      panes: {
        filters: { expanded: false, visible: false },
        pageNavigation: { visible: false },
      },
      background: models.BackgroundType.Transparent,
    };
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
      settings: embedPaneSettings(models),
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

    var i;
    for (i = 0; i < pages.length; i++) {
      var label = pages[i].displayName || pages[i].name || '';
      if (RESULTS_PAGE_RE.test(label)) return pages[i];
    }

    for (i = 0; i < pages.length; i++) {
      var displayName = pages[i].displayName || '';
      var internalName = pages[i].name || '';
      if (LANDING_PAGE_RE.test(displayName)) continue;
      if (EXCLUDED_EMBED_PAGE_RE.test(displayName) || EXCLUDED_EMBED_PAGE_RE.test(internalName)) {
        continue;
      }
      return pages[i];
    }

    return pages.length > 1 ? pages[1] : null;
  }

  function hidePageNavigation(report) {
    var models = global['powerbi-client'].models;
    return report.updateSettings(embedPaneSettings(models)).catch(function () {});
  }

  function isExcludedPage(page) {
    var displayName = page.displayName || '';
    var internalName = page.name || '';
    return (
      LANDING_PAGE_RE.test(displayName) ||
      EXCLUDED_EMBED_PAGE_RE.test(displayName) ||
      EXCLUDED_EMBED_PAGE_RE.test(internalName)
    );
  }

  function redirectIfExcludedPage(report, preferredPageName) {
    return report.getActivePage().then(function (page) {
      if (!isExcludedPage(page)) return;
      return activateResultsPage(report, preferredPageName);
    });
  }

  function activateResultsPage(report, preferredPageName) {
    if (preferredPageName) {
      return report.setPage(preferredPageName).catch(function () {
        return report.getPages().then(function (pages) {
          var target = findResultsPage(pages);
          if (target) return target.setActive();
        });
      });
    }
    return report.getPages().then(function (pages) {
      var target = findResultsPage(pages);
      if (target) return target.setActive();
    });
  }

  function applyEmbedHeight(container) {
    var custom = global.PASSGP_PBI_EMBED_HEIGHT;
    container.style.width = '100%';
    if (custom) {
      container.style.height = custom;
      container.style.minHeight = custom;
      return;
    }
    // Power BI standard 16:9 canvas — same approach as Microsoft embed samples
    container.style.aspectRatio = '16 / 9';
    container.style.minHeight = '480px';
    container.style.maxHeight = '75vh';
    container.style.height = 'auto';
  }

  function embedPassgpReport(container, data) {
    var config = buildEmbedConfig(data);
    var pageName = resolvePageName(data);
    applyEmbedHeight(container);
    global.powerbi.reset(container);
    var report = global.powerbi.embed(container, config);

    report.on('loaded', function () {
      hidePageNavigation(report);
      activateResultsPage(report, pageName).catch(function () {});
    });

    report.on('rendered', function () {
      hidePageNavigation(report);
    });

    // Allow in-report buttons to navigate between member pages; only block Landing/QA.
    report.on('pageChanged', function () {
      redirectIfExcludedPage(report, pageName).catch(function () {});
    });

    return report;
  }

  global.PassgpPbiEmbed = {
    buildMemberFilter: buildMemberFilter,
    buildEmbedConfig: buildEmbedConfig,
    embedPassgpReport: embedPassgpReport,
  };
})(typeof window !== 'undefined' ? window : this);
