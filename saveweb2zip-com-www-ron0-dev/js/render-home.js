(function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderNavLink(link) {
    var attrs = [
      'href="' + escapeHtml(link.href) + '"'
    ];

    if (link.className) {
      attrs.push('class="' + escapeHtml(link.className) + '"');
    }

    if (link.external) {
      attrs.push('target="_blank"');
      attrs.push('rel="noopener noreferrer"');
    }

    return [
      '<li class="breadcrumb-item my-1 my-md-0 ms-3 ms-md-0">',
      '<a ' + attrs.join(" ") + '>' + escapeHtml(link.label) + '</a>',
      '</li>'
    ].join("");
  }

  function renderLinks(links) {
    if (!links || !links.length) {
      return "";
    }

    return [
      '<span class="timeline-icons">',
      links.map(function (link) {
        return '<a href="' + escapeHtml(link.href) + '" class="' + escapeHtml(link.iconClass) + '" title="' + escapeHtml(link.title) + '"></a>';
      }).join(""),
      '</span>'
    ].join("");
  }

  function renderTimelineItem(item) {
    var title = item.titleHtml || escapeHtml(item.title || "");
    var desc = item.descHtml || escapeHtml(item.desc || "");
    var className = item.className ? " " + item.className : "";

    return [
      '<div class="timeline-item' + className + '">',
      renderLinks(item.links),
      '<span class="timeline-date">' + escapeHtml(item.date) + '</span>',
      '<span class="timeline-title">' + title + '</span>',
      '<span class="timeline-desc">' + desc + '</span>',
      '</div>'
    ].join("");
  }

  function renderTimelineYear(yearGroup) {
    return [
      '<div class="timeline-year">',
      '<aside>' + escapeHtml(yearGroup.year) + '</aside>',
      '<div class="timeline-grid">',
      yearGroup.items.map(renderTimelineItem).join(""),
      '</div>',
      '</div>'
    ].join("");
  }

  function renderPage() {
    var data = window.siteData;
    if (!data) {
      return;
    }

    var navRoot = document.getElementById("site-nav-list");
    var timelineRoot = document.getElementById("timeline-root");

    if (navRoot) {
      navRoot.innerHTML = data.navLinks.map(renderNavLink).join("");
    }

    if (timelineRoot) {
      timelineRoot.innerHTML = data.timeline.map(renderTimelineYear).join("");
    }
  }

  renderPage();
}());
