(function () {
  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
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

  function getStoredTheme() {
    return localStorage.getItem("theme") || getSystemTheme();
  }

  function toggleTheme() {
    var nextTheme = document.body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }

  function bindThemeToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.addEventListener("click", toggleTheme);
    }

    updateThemeLabel(document.body.classList.contains("dark") ? "dark" : "light");
  }

  window.addEventListener(
    "message",
    function (event) {
      if (event.origin !== "https://giscus.app") {
        return;
      }

      if (event.data && event.data.giscus) {
        updateGiscusTheme(document.body.classList.contains("dark") ? "dark" : "light");
      }
    },
    { once: true }
  );

  window.toggleTheme = toggleTheme;
  applyTheme(getStoredTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeToggle, { once: true });
  } else {
    bindThemeToggle();
  }
}());
