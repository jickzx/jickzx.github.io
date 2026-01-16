// ===== Set Current Year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== GSAP Horizontal Scroll for Projects =====
gsap.registerPlugin(ScrollTrigger);

const projectsTrack = document.querySelector('.projects-track');
const projectsWrapper = document.querySelector('.projects-wrapper');

// Calculate how far to scroll horizontally
const getScrollAmount = () => {
  const trackWidth = projectsTrack.scrollWidth;
  return -(trackWidth - window.innerWidth);
};

// Create the horizontal scroll animation
const projectsAnimation = gsap.to(projectsTrack, {
  x: getScrollAmount,
  ease: 'none',
  scrollTrigger: {
    trigger: projectsWrapper,
    start: 'top top',
    end: () => `+=${projectsTrack.scrollWidth}`,
    scrub: 1,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true
  }
});

// Recalculate on window resize
window.addEventListener('resize', () => {
  ScrollTrigger.refresh();
});

// ===== Smooth Scroll for Internal Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== Fade In Animation on Scroll =====
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-up');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe project cards and about section for animations
document.querySelectorAll('.project-card, .about-content').forEach(el => {
  observer.observe(el);
});