// ===== Year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();


// ===== Theme toggle (respects system, stores preference)
const toggle = document.getElementById('themeToggle');
const stored = localStorage.getItem('theme');
if (stored) {
document.documentElement.setAttribute('data-theme', stored);
if (toggle) toggle.textContent = stored === 'light' ? '🌙' : '☀️';
}
if (toggle) {
toggle.addEventListener('click', () => {
const next = (document.documentElement.getAttribute('data-theme') === 'light') ? 'dark' : 'light';
document.documentElement.setAttribute('data-theme', next);
localStorage.setItem('theme', next);
toggle.textContent = next === 'light' ? '🌙' : '☀️';
});
}


// ===== Contact form (demo only)
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
if (form && statusEl) {
form.addEventListener('submit', (e) => {
e.preventDefault();
statusEl.textContent = 'Sending…';
// Demo: replace with your endpoint (Formspree/Resend/EmailJS/etc.)
// fetch('YOUR_ENDPOINT', { method:'POST', body:new FormData(form) })
// .then(() => statusEl.textContent = 'Thanks! I’ll get back to you soon.')
// .catch(() => statusEl.textContent = 'Oops! Something went wrong.');
setTimeout(() => statusEl.textContent = 'Thanks! I’ll get back to you soon.', 500);
form.reset();
});
}


// ===== Smooth scroll for internal links
const internalLinks = document.querySelectorAll('a[href^="#"]');
internalLinks.forEach(a => {
a.addEventListener('click', (e) => {
const id = a.getAttribute('href').slice(1);
const el = document.getElementById(id);
if (el) { e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' }); }
});
});