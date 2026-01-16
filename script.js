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
    // Start a 3-second timer when tab becomes hidden
    titleTimeout = setTimeout(() => {
      document.title = 'I miss you 😢';
    }, 3000);
  } else {
    // Clear the timer and restore original title when user comes back
    clearTimeout(titleTimeout);
    document.title = originalTitle;
  }
});

// ===== Contact form (demo only) - Commented out since contact section is not in HTML
// const form = document.getElementById('contactForm');
// const statusEl = document.getElementById('formStatus');
// form.addEventListener('submit', (e) => {
//   e.preventDefault();
//   statusEl.textContent = 'Sending…';
//   // Demo: replace with your endpoint (Formspree/Resend/EmailJS/etc.)
//   // fetch('YOUR_ENDPOINT', { method:'POST', body:new FormData(form) })
//   //  .then(() => statusEl.textContent = 'Thanks! I'll get back to you soon.')
//   //  .catch(() => statusEl.textContent = 'Oops! Something went wrong.');
//   setTimeout(() => {
//     statusEl.textContent = "Thanks! I'll get back to you soon.";
//   }, 500);
//   form.reset();
// });

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

// ===== Easter egg: Toggle brown theme on 'poo' sequence with descending animation
let keySequence = '';
let originalTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

document.addEventListener('keydown', (e) => {
  console.log('Key pressed:', e.key); // Temporary debug log
  keySequence += e.key.toLowerCase();
  console.log('Sequence:', keySequence); // Temporary debug log
  if (keySequence.endsWith('poo')) {
    console.log('Poo sequence detected!'); // Temporary debug log
    const currentTheme = document.documentElement.getAttribute('data-theme') || originalTheme;
    if (currentTheme === 'brown') {
      // If already brown, revert instantly
      document.documentElement.setAttribute('data-theme', originalTheme);
      localStorage.setItem('theme', originalTheme);
    } else {
      // Animate descending brown overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 0;
        background: #8B4513; /* Brown background */
        color: #FFF8DC; /* Brown text */
        z-index: 9999;
        transition: height 0.5s ease-in; /* Starts slow, gets quicker */
        pointer-events: none;
      `;
      document.body.appendChild(overlay);
      console.log('Overlay added'); // Temporary debug log
      // Trigger animation
      overlay.offsetHeight; // Force reflow
      overlay.style.height = '100%';
      // After animation, apply theme and remove overlay
      setTimeout(() => {
        document.documentElement.setAttribute('data-theme', 'brown');
        localStorage.setItem('theme', 'brown');
        document.body.removeChild(overlay);
        console.log('Theme applied and overlay removed'); // Temporary debug log
      }, 500); // Match the transition duration
    }
    keySequence = ''; // Reset sequence after activation
  }
  // Optional: Limit sequence length to prevent memory issues
  if (keySequence.length > 10) keySequence = keySequence.slice(-10);
});