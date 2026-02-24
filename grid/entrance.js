(function () {
  'use strict';

  var heroBg = document.getElementById('hero-bg-image');
  if (heroBg) {
    heroBg.style.backgroundImage = 'url(https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=1920&q=85)';
  }

  var scrollIndicator = document.getElementById('scroll-indicator');
  var whoWeAre = document.getElementById('who-we-are');
  if (scrollIndicator && whoWeAre) {
    scrollIndicator.addEventListener('click', function () {
      whoWeAre.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  if (whoWeAre && 'IntersectionObserver' in window) {
    whoWeAre.classList.add('who-we-are--hidden');
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) e.target.classList.remove('who-we-are--hidden');
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(whoWeAre);
  }
})();
