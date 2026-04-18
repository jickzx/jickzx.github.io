(function () {
  var siteData = {
    navLinks: [
      {
        href: "/",
        label: "home",
        className: "text-decoration-underline link-offset-3"
      },
      {
        href: "/about.html",
        label: "about"
      },
      {
        href: "/posts.html",
        label: "posts"
      },
      {
        href: "https://github.com/jickzx",
        label: "github",
        external: true
      },
      {
        href: "https://www.linkedin.com/in/jaesp/",
        label: "linkedin",
        external: true
      },
    ],
    timeline: [
      {
        year: "2026",
        items: [
          {
            date: "Jun | Internship",
            title: "Bright Network",
            desc: "IEUK, Incoming Technology Internship (backup internship)",
            className: "span-2",
          },
          // {
          //   date: "Jun | Hackathon",
          //   title: "Hack The Law, Cambridge",
          //   desc: "Incoming...",
          // },
          // {
          //   date: "Apr | Hackathon",
          //   title: "HackBelfast",
          //   desc: "",
          // },
          {
            date: "Apr | Hackathon",
            title: "Global HackTour London",
            desc: ""
          }, 
          {
            date: "Apr | Hackathon",
            title: "{Tech: Europe} London AI Hackathon",
            className: "gold-outline",
            // className: "span-2",
            descHtml: '<span class="timeline-award-strong">1st Gradium, 2nd Google, 3rd Overall</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7449353115927011328/",
                iconClass: "icon-linkedin",
                title: "LinkedIn",
              }
            ]
          },
          {
            date: "Apr | Internship",
            title: "Practera",
            desc: "Student Consultant - Project Manager for Startup company Aeggnologie Corp.",
            className: "span-2 practera-card",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7437594447497990144/",
                iconClass: "icon-linkedin",
                title: "LinkedIn",
              }
            ]
          },
          {
            date: "Mar | Hackathon",
            title: "UoN MedTech Hackathon",
            className: "gold-outline",
            descHtml: '<span class="timeline-award-strong">2nd Place</span>',
            links: [
              {
                href: "https://vikas-projects25.github.io/Physio-Track/",
                iconClass: "icon-internet",
                title: "Internet",
              }
            ]
          },
          {
            date: "Mar | Hackathon",
            title: "SotonHack",
            descHtml: '<span class="timeline-award-strong">My teammate, Anson, won best meme!</span>',
            className: "gold-outline",
          },
          {
            date: "Feb-Mar | Hackathon",
            title: "HackSussex",
          },
          {
            date: "Feb | Hackathon",
            title: "HackLondon",
            className: "gold-outline",
            // className: "span-2",
            descHtml: '<span class="timeline-award-strong">1st Place</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7433798301671387136/",
                external: true,
                iconClass: "icon-linkedin",
                title: "LinkedIn",
              },
              // {
              //   // href: "",
              //   // iconClass: "icon-github",
              //   // title: "GitHub"
              // },
              {
                href: "https://grid-alpha-amber.vercel.app/",
                external: true,
                iconClass: "icon-internet",
                title: "globe",
              }
            ]
          },
          {
            date: "Jan-Feb | Hackathon",
            title: "UCL RealTech Hackathon",
            // MARK: coloured titles
            // titleHtml: '<span class="text-groq">Groq</span> <span class="text-nvidia">(now NVIDIA)</span>',
            desc: "",
          },
          {
            date: "Jan | Experience",
            title: "APSTEM",
            desc: "Technology Ambassador",
          }
        ]
      },
      {
        year: "2025",
        items: [
          {
            date: "Dec | Hackathon",
            title: "UoN Winter GameJam",
            className: "gold-outline",
            descHtml: '<span class="timeline-award-strong">1st Place</span>',
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7412221033941774337/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/jickzx/Snowball-plus",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Oct | Hackathon",
            title: "HackNotts",
            links: [
              {
                href: "https://www.linkedin.com/feed/update/urn:li:activity:7412221033941774337/",
                iconClass: "icon-linkedin",
                title: "LinkedIn"
              },
              {
                href: "https://github.com/UoN-HackNotts/Paladins-Of-Pi",
                iconClass: "icon-github",
                title: "GitHub"
              }
            ]
          },
          {
            date: "Oct | Competitive Programming",
            title: "UKIEPC",
            desc: "204th Overall, 9th in Nottingham"
          },
          {
            date: "Sep | Competitive Programming",
            title: "Nottingham Annual Coding Competition",
            desc: "21st Out Of 34 Teams",
          },
          {
            date: "Apr | Personal Project",
            title: "Query a Degree",
            desc: "Query a Degree by comparing your chances to previous students by inputting grades. Awarded 53/70 marks."
          }
        ]
      },
      {
        year: "2024",
        items: [
          {
            date: "Apr & Sep | Spring Insight",
            title: "PwC, More London Office",
            desc: "Virtual Insight, then invited in September for in-person day"
          },
          {
            date: "Mar | Spring Insight",
            title: "ARM, Cambridge Office",
            desc: "Joined with 30 other students"
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
