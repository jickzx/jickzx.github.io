// ===== Set Current Year =====
document.getElementById('year').textContent = new Date().getFullYear();

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

// ===== Project Side Panel Functionality =====
const projectData = {
  qrcode: {
    title: "Personal Portfolio Website",
    date: "November 8, 2025",
    image: "images/chris.png",
    fullDescription: `This is still under construction... Bear with me.
    
    `,
    features: [
    ],
    technologies: ["Python"],
    github: "#",
  },
  portfolio: {
    title: "Personal Portfolio Website",
    date: "November 8, 2025",
    image: "images/PortfolioWebsite.png",
    description: "A modern, responsive portfolio website built from scratch to showcase my projects and skills.",
    fullDescription: `This portfolio website represents my journey in web development. Built with pure HTML, CSS, and JavaScript, it features a modern design with smooth animations, a responsive layout, and an engaging user experience.
    
    The site includes animated backgrounds, a project showcase grid, an interactive about section with my skills and interests, and now this dynamic side panel for detailed project views!`,
    features: [
      "Fully responsive design that works on all devices",
      "Smooth scroll animations and transitions",
      "Animated floating background shapes",
      "Dynamic project detail panels",
      "Modern glassmorphism design elements",
      "Optimized performance and fast loading"
    ],
    technologies: ["HTML", "CSS", "JavaScript"],
    github: "#",
    live: "#"
  },
  gamejam: {
    title: "UoN CompSoc '25 GameJam",
    date: "December 08, 2025",
    media: [
      {
        type: "image",
        src: "https://media.licdn.com/dms/image/v2/D4E22AQH4FijlyatVsw/feedshare-shrink_2048_1536/B4EZt185lxJ0Aw-/0/1767210458941?e=1770249600&v=beta&t=j-sFgnYAcnEQU2HPSHD_qDFBzYvEVZspisu6lnq8LiQ"
      },
      {
        type: "video",
        src: "https://www.youtube.com/embed/Hrmt9tdTrS4"
      }
    ],
    description: "An exciting snowball stacking game created during UoN's Winter GameJam for 2025.",
    fullDescription: `During the intense 8-hour GameJam event, our team created a physics-based snowball stacking game that challenges players with progressively harder levels.
    
    The game features realistic physics simulation, increasingly difficult challenges, and engaging gameplay mechanics that keep players coming back for more. This was an incredible learning experience in game development and team collaboration under pressure.`,
    features: [
      "Physics-based snowball mechanics",
      "Progressive difficulty system",
      "Engaging gameplay loop",
      "Score tracking and leaderboards",
      "Team collaboration across disciplines",
      "Completed within 8-hour time limit"
    ],
    technologies: ["Unity", "C#", "Github"],
    github: "#"
  },
  hacknotts: {
    title: "HackNotts '25 Raspberry Pi Chatbot",
    date: "October 24, 2025",
    media: [
      {
        type: "image",
        src: "images/hacknotts25.png"
      },
      {
        type: "video",
        src: "https://www.youtube.com/embed/_9KZp1zetrI"
      }
    ],
    description: "An AI-powered chatbot running on a Raspberry Pi, built during the HackNotts hackathon.",
    fullDescription: `Within just 25 hours at HackNotts, we built a fully functional AI chatbot that runs entirely on a Raspberry Pi. This project challenged us to optimize AI models to run on limited hardware while maintaining responsive performance.
    
    The chatbot can engage in natural conversations, answer questions, and provide helpful responses. This project taught me valuable lessons about hardware constraints, optimization, and rapid prototyping.`,
    features: [
      "AI-powered natural language processing",
      "Optimized for Raspberry Pi hardware",
      "Real-time conversation capabilities",
      "JSON-based data handling",
      "Low latency response times",
      "Built in under 25 hours"
    ],
    technologies: ["Python", "Raspberry Pi", "Json"]
  },
  "university-checker": {
    title: "University Probability Checker",
    date: "June 10, 2023",
    media: [
      {
        type: "image",
        src: "images/unichecker.png"
      },
      {
        type: "image",
        src: "images/Unichecker2.png"
      },
      {
        type: "video",
        src: "https://www.youtube.com/watch?v=j95X8x0Itbs"
      }
    ],
    description: "My A-Level Computer Science coursework project that helps students assess their university admission chances.",
    fullDescription: `This was my major project for A-Level Computer Science, where I achieved 53/70 marks. The application analyzes student data and provides probability estimates for university admissions based on historical data.
    
    The system uses SQL databases to store and query large datasets, processes CSV files with student information, and employs statistical algorithms to generate accurate predictions. This project taught me database design, data analysis, and building practical applications that solve real-world problems.`,
    features: [
      "Statistical analysis of admission chances",
      "SQL database integration",
      "CSV data import and processing",
      "User-friendly interface",
      "Historical data analysis",
      "Scored 53/70 marks"
    ],
    technologies: ["Python", "SQL", "CSV"]
  },
  chess: {
    title: "Chess Game in Java",
    date: "July 5, 2025",
    description: "A work-in-progress chess game with plans for AI opponents and multiplayer functionality.",
    fullDescription: `This ongoing project is my exploration into game logic and artificial intelligence. I'm building a fully functional chess game in Java that will eventually feature AI opponents with multiple difficulty levels and online multiplayer capabilities.
    
    The project focuses on implementing chess rules, move validation, game state management, and eventually AI using algorithms like minimax with alpha-beta pruning. It's been a great way to deepen my understanding of object-oriented programming and algorithm design.`,
    features: [
      "Complete chess rule implementation",
      "Move validation system",
      "Game state management",
      "Planned: AI opponents (in progress)",
      "Planned: Multiplayer functionality",
      "Clean object-oriented design"
    ],
    technologies: ["Java"]
  },
  year12: {
    title: "Year 12 HTML Project",
    date: "December 05, 2023",
    image: "images/yes.png",
    description: "One of my first web development projects from Year 12, introducing me to HTML, CSS, and JavaScript.",
    fullDescription: `This was a foundational project assigned by my teacher that introduced me to web development. While simple compared to my current work, it was instrumental in sparking my interest in creating interactive web experiences.
    
    Looking back at this project, I can see how much I've grown as a developer. It taught me the basics of HTML structure, CSS styling, and JavaScript interactivity - skills that form the foundation of everything I build today.`,
    features: [
      "Basic HTML structure",
      "CSS styling and layout",
      "JavaScript interactivity",
      "Responsive design basics",
      "First web development project",
      "Foundation for future learning"
    ],
    technologies: ["HTML", "CSS", "JavaScript"]
  }
};

const overlay = document.getElementById('project-overlay');
const panel = document.getElementById('project-panel');
const panelContent = document.getElementById('panel-content');
const closeBtn = document.getElementById('panel-close');

// Function to open project panel
function openProjectPanel(projectId) {
  const project = projectData[projectId];
  if (!project) return;

  // Build panel content
  let contentHTML = `
    <h2>${project.title}</h2>
    <div class="project-meta">
      <div class="meta-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z"/>
        </svg>
        ${project.date}
      </div>
    </div>
  `;

  // Add media carousel if project has media array
  if (project.media && project.media.length > 0) {
    contentHTML += `
      <div class="media-carousel">
        <div class="media-container" id="media-container">
    `;
    
    project.media.forEach((item, index) => {
      if (item.type === "image") {
        contentHTML += `
          <div class="media-item ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="panel-image">
              <img src="${item.src}" alt="${project.title}">
            </div>
          </div>
        `;
      } else if (item.type === "video") {
        contentHTML += `
          <div class="media-item ${index === 0 ? 'active' : ''}" data-index="${index}">
            <div class="panel-video">
              <iframe src="${item.src}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
            </div>
          </div>
        `;
      }
    });
    
    contentHTML += `
        </div>
    `;
    
    // Add navigation buttons if more than one media item
    if (project.media.length > 1) {
      contentHTML += `
        <button class="media-nav media-prev" onclick="changeMedia(-1)">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        <button class="media-nav media-next" onclick="changeMedia(1)">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
        <div class="media-indicators">
          ${project.media.map((_, index) => `
            <span class="indicator ${index === 0 ? 'active' : ''}" onclick="goToMedia(${index})"></span>
          `).join('')}
        </div>
      `;
    }
    
    contentHTML += `</div>`;
  }
  // Fallback to single image if project has image property (for backward compatibility)
  else if (project.image) {
    contentHTML += `
      <div class="panel-image">
        <img src="${project.image}" alt="${project.title}">
      </div>
    `;
  }
  // Fallback to single video if project has video property (for backward compatibility)
  else if (project.video) {
    contentHTML += `
      <div class="panel-video">
        <iframe src="${project.video}" allowfullscreen></iframe>
      </div>
    `;
  }

  // Add description
  contentHTML += `
    <div class="panel-section">
      <h3>About This Project</h3>
      <p>${project.fullDescription || project.description}</p>
    </div>
  `;

  // Add features if they exist
  if (project.features && project.features.length > 0) {
    contentHTML += `
      <div class="panel-section">
        <h3>Key Features</h3>
        <ul>
          ${project.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Add technologies
  contentHTML += `
    <div class="panel-section">
      <h3>Technologies Used</h3>
      <div class="project-tags">
        ${project.technologies.map(tech => `<span class="tag">${tech}</span>`).join('')}
      </div>
    </div>
  `;

  // Add links if they exist
  if (project.github || project.live) {
    contentHTML += `
      <div class="panel-section">
        <h3>Links</h3>
        <div class="cta-buttons" style="justify-content: flex-start;">
    `;
    
    if (project.github) {
      contentHTML += `<a href="${project.github}" class="btn btn-secondary" target="_blank" rel="noopener">View Code</a>`;
    }
    if (project.live) {
      contentHTML += `<a href="${project.live}" class="btn btn-primary" target="_blank" rel="noopener">Live Demo</a>`;
    }
    
    contentHTML += `
        </div>
      </div>
    `;
  }

  panelContent.innerHTML = contentHTML;

  // Show panel and overlay
  setTimeout(() => {
    overlay.classList.add('active');
    panel.classList.add('active');
    document.body.style.overflow = 'hidden';
  }, 10);
}

// Function to close project panel
function closeProjectPanel() {
  overlay.classList.remove('active');
  panel.classList.remove('active');
  document.body.style.overflow = '';
}

// Add click listeners to project cards
document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('click', function() {
    const projectId = this.getAttribute('data-project');
    if (projectId) {
      openProjectPanel(projectId);
    }
  });
  
  // Add pointer cursor
  card.style.cursor = 'pointer';
});

// Close panel when clicking close button
closeBtn.addEventListener('click', closeProjectPanel);

// Close panel when clicking overlay
overlay.addEventListener('click', closeProjectPanel);

// Close panel with Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeProjectPanel();
  }
});

// ===== Media Carousel Navigation =====
let currentMediaIndex = 0;

function changeMedia(direction) {
  const mediaItems = document.querySelectorAll('.media-item');
  const indicators = document.querySelectorAll('.indicator');
  
  if (mediaItems.length === 0) return;
  
  // Remove active class from current item
  mediaItems[currentMediaIndex].classList.remove('active');
  indicators[currentMediaIndex].classList.remove('active');
  
  // Calculate new index
  currentMediaIndex += direction;
  
  // Wrap around
  if (currentMediaIndex >= mediaItems.length) {
    currentMediaIndex = 0;
  } else if (currentMediaIndex < 0) {
    currentMediaIndex = mediaItems.length - 1;
  }
  
  // Add active class to new item
  mediaItems[currentMediaIndex].classList.add('active');
  indicators[currentMediaIndex].classList.add('active');
}

function goToMedia(index) {
  const mediaItems = document.querySelectorAll('.media-item');
  const indicators = document.querySelectorAll('.indicator');
  
  if (mediaItems.length === 0) return;
  
  // Remove active class from current item
  mediaItems[currentMediaIndex].classList.remove('active');
  indicators[currentMediaIndex].classList.remove('active');
  
  // Set new index
  currentMediaIndex = index;
  
  // Add active class to new item
  mediaItems[currentMediaIndex].classList.add('active');
  indicators[currentMediaIndex].classList.add('active');
}

// Reset media index when opening a new panel
const originalOpenFunction = openProjectPanel;
openProjectPanel = function(projectId) {
  currentMediaIndex = 0;
  originalOpenFunction(projectId);
};
// Discord copy functionality
const discordLink = document.getElementById('discord-link');
discordLink.addEventListener('click', function(e) {
  e.preventDefault();
  const username = this.getAttribute('data-username');
  
  navigator.clipboard.writeText(username).then(() => {
    const tooltip = this.querySelector('.copy-tooltip');
    tooltip.classList.add('show');
    
    setTimeout(() => {
      tooltip.classList.remove('show');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
});