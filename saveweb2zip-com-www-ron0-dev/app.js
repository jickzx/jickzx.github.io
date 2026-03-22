(function () {
  var siteData = {
    navLinks: [
      {
        href: "/",
        label: "home",
        className: "text-decoration-underline link-offset-3"
      },
      // {
      //   href: "/posts",
      //   label: "posts"
      // },
      {
        href: "https://github.com/ron0studios",
        label: "github",
        external: true
      },
      {
        href: "https://www.linkedin.com/in/rudrrayan/",
        label: "linkedin",
        external: true
      }
    ],
    timeline: [
      {
        year: "2026",
        items: [
          {
            date: "Jan - May | Internship",
            titleHtml: '<span class="text-groq">Groq</span> <span class="text-nvidia">(now NVIDIA)</span>',
            desc: "Distributed Systems + Inference Engineering"
          }
        ]
      },
      {
        year: "2025",
        items: [
          {
            date: "Nov | Hackathon",
            title: "Junction",
            descHtml: '<span class="timeline-award-strong">Overall winner</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7395862667153997824/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/ron0studios/WAVELET",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Nov | Hackathon",
            title: "LauzHack",
            descHtml: '<span class="timeline-award-strong">Overall winner</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7398430753149067264/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/logilinux/logilinux",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Oct | Competitive Programming",
            title: "UKIEPC",
            desc: "9th Nottingham"
          },
          {
            date: "Aug - Oct | Research Internship",
            titleHtml: "J&uuml;lich Supercomputing Centre",
            descHtml: 'Distributing/Load balancing FMM <span class="is-muted-half">(github coming soon!)</span>',
            className: "span-2",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7391092940523151360/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              }
            ]
          },
          {
            date: "Jun - Aug | Startups",
            title: "Founders Inc.",
            desc: "Offseason Cohort, 6 weeks in SF!",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7343469945244053504/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://www.youtube.com/@thetopazblock",
                iconClass: "icon-internet",
                title: "Link"
              }
            ]
          },
          {
            date: "Jun | Event",
            title: "YC AI Startup School",
            desc: "Flown to SF! Met cool people",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7333951866126430213",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              }
            ]
          },
          {
            date: "Apr | Hackathon",
            title: "HackUPC",
            descHtml: '<span class="timeline-award-strong">Revolut track winner</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7325258794744143872/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/ron0studios/Referlut",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Mar | Competition",
            title: "Citadel Terminal",
            descHtml: '<span class="timeline-award">European top 10</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7321292202234580994",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/Eric-xin/run_time_terror_C1Terminal",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Feb - Jun | Competition",
            title: "BriCS",
            desc: "ISC Student Cluster Competition",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7340598254776045568/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/UK-SCC",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Jan - Apr | Internship",
            title: "XPRIZE",
            desc: "HARIS swarm drone platform",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7352440926285221888",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://uos-haris.online/",
                iconClass: "icon-internet",
                title: "Link"
              }
            ]
          }
        ]
      },
      {
        year: "2024",
        items: [
          {
            date: "Hackathon",
            title: "HackSussex",
            descHtml: '<span class="timeline-award">CASM track winner</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7300283959374954496",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/ron0studios/decipherati-tools",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Competition",
            title: "Huawei Tech Arena UK",
            desc: "Branch Prediction",
            links: [
              {
                href: "https://github.com/ron0studios/TechArena2024",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Oct | Hackathon",
            title: "Southampton HackStart",
            desc: "Overall 3rd",
            links: [
              {
                href: "https://github.com/ron0studios/TechArena2024",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          }
        ]
      },
      {
        year: "2023",
        items: [
          {
            date: "Competition",
            title: "National Cipher Challenge",
            descHtml: '<span class="timeline-award">Gold &pound;1000 IBM Prize</span>',
            links: [
              {
                href: "https://web.archive.org/web/20230315224026/https://thebusinessmagazine.co.uk/esg/southampton-uni-codebreakig-challenge-winners-announced/",
                iconClass: "icon-internet",
                title: "Link"
              },
              {
                href: "https://github.com/ron0studios/decipherati-tools",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Competitive Programming",
            title: "British Informatics Olympiad",
            descHtml: '<span class="timeline-award">Top 30 Nationally</span>',
            links: [
              {
                href: "https://github.com/ron0studios/algospace",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          }
        ]
      }
    ]
  };

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem("theme") || getSystemTheme();
    } catch (error) {
      return getSystemTheme();
    }
  }

  function updateThemeLabel(theme) {
    var label = document.getElementById("theme-label");
    if (label) {
      label.textContent = theme === "dark" ? "dark mode" : "light mode";
    }
  }

  function updateGiscusTheme(theme) {
    var giscusTheme = theme === "dark" ? "dark" : "light";
    var frame = document.querySelector("iframe.giscus-frame");

    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(
        {
          giscus: {
            setConfig: {
              theme: giscusTheme
            }
          }
        },
        "https://giscus.app"
      );
    }
  }

  function applyTheme(theme) {
    document.body.classList.remove("dark", "text-dark", "text-light");

    if (theme === "dark") {
      document.body.classList.add("dark", "text-light");
    } else {
      document.body.classList.add("text-dark");
    }

    updateThemeLabel(theme);
    updateGiscusTheme(theme);
  }

  function toggleTheme() {
    var nextTheme = document.body.classList.contains("dark") ? "light" : "dark";

    try {
      window.localStorage.setItem("theme", nextTheme);
    } catch (error) {
      // Ignore storage failures and still update the UI.
    }

    applyTheme(nextTheme);
  }

  function bindThemeToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", toggleTheme);
    }

    updateThemeLabel(document.body.classList.contains("dark") ? "dark" : "light");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
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
    var navRoot = document.getElementById("site-nav-list");
    var timelineRoot = document.getElementById("timeline-root");

    if (navRoot) {
      navRoot.innerHTML = siteData.navLinks.map(renderNavLink).join("");
    }

    if (timelineRoot) {
      timelineRoot.innerHTML = siteData.timeline.map(renderTimelineYear).join("");
    }
  }

  function initDom() {
    bindThemeToggle();
    renderPage();
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== "https://giscus.app") {
      return;
    }

    if (event.data && event.data.giscus) {
      updateGiscusTheme(document.body.classList.contains("dark") ? "dark" : "light");
    }
  });

  applyTheme(getStoredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDom, { once: true });
  } else {
    initDom();
  }
}());
