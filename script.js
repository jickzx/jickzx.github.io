// ===== Year
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Theme toggle (respects system, stores preference)
const toggle = document.getElementById('themeToggle');
const stored = localStorage.getItem('theme');
if(stored){ 
  document.documentElement.setAttribute('data-theme', stored); 
  toggle.textContent = stored === 'light' ? '🌙' : '☀️'; 
}
toggle.addEventListener('click', () => {
  const next = (document.documentElement.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  toggle.textContent = next === 'light' ? '🌙' : '☀️';
});

// ===== Tab title change when user leaves (with 5 second delay)
const originalTitle = document.title;
let titleTimeout;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Start a 5-second timer when tab becomes hidden
    titleTimeout = setTimeout(() => {
      document.title = 'I miss you chat 😢';
    }, 5000);
  } else {
    // Clear the timer and restore original title when user comes back
    clearTimeout(titleTimeout);
    document.title = originalTitle;
  }
});

// ===== Contact form (demo only)
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  statusEl.textContent = 'Sending…';
  // Demo: replace with your endpoint (Formspree/Resend/EmailJS/etc.)
  // fetch('YOUR_ENDPOINT', { method:'POST', body:new FormData(form) })
  //  .then(() => statusEl.textContent = 'Thanks! I'll get back to you soon.')
  //  .catch(() => statusEl.textContent = 'Oops! Something went wrong.');
  setTimeout(() => {
    statusEl.textContent = "Thanks! I'll get back to you soon.";
  }, 500);
  form.reset();
});

// ===== Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){ 
      e.preventDefault(); 
      el.scrollIntoView({ behavior:'smooth', block:'start' }); 
    }
  });
});