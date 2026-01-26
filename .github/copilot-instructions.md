# AI Coding Agent Instructions for James Espinosa's Portfolio

## Project Overview
This is a modern, custom-built portfolio website showcasing CS projects and personal interests. Built with vanilla HTML, CSS, and JavaScript (no frameworks). Currently in active development with a focus on polish, animations, and eventually mobile responsiveness.

## Architecture & Key Patterns

### Project Data System
The portfolio uses a **centralized object-based project data structure** (`projectData` in `script.js`, lines 41-250):
- Each project is a key-value object with properties: `title`, `date`, `fullDescription`, `technologies`, `features`, `media[]`
- Media is flexible: supports both `image` (single) and `media` (array with images/videos)
- Projects populate dynamically into the DOM via `openProjectPanel(projectId)` function
- **Key convention**: HTML project cards use `data-project="projectId"` attribute to link to data object

### Navigation & State Management
- **Side navigation** with overlay (`side-nav`, `nav-overlay`) toggles via hamburger menu
- **Smooth scrolling** via anchor links (`a[href^="#"]`) - uses native `scrollIntoView()` API
- **Intersection Observer pattern** for fade-in animations on scroll (`observerOptions`, lines 18-26)
- Keyboard support: Escape key closes modals, menu click handlers close nav

### Modal/Panel System
- Project detail panel uses **overlay + side panel pattern**: `project-overlay` + `project-panel`
- Media carousel within panels supports navigation via prev/next buttons and indicator dots
- **Media carousel state**: `currentMediaIndex` variable tracks position; `changeMedia()` and `goToMedia()` manage transitions
- Panel closes on: overlay click, close button, or Escape key

## Development Workflow

### Animation System
- CSS custom animations (`:root` variables: `--black`, `--white`, `--accent`, `--accent-2`)
- **Floating background shapes** use `@keyframes float` with 20s duration and staggered delays
- **Fade-in-up**: Applied dynamically via `fade-in-up` class when elements enter viewport
- **glassmorphism** design elements (check `styles.css` for backdrop-filter usage)

### Adding New Projects
1. Add project object to `projectData` in `script.js` (follow existing pattern)
2. Create matching HTML card in `index.html` with `data-project="key"`
3. Add project image/media to `images/` folder
4. Update technologies and features arrays

### Performance Considerations
- **Fixed animated background** (`.animated-bg`) is GPU-accelerated at z-index -1
- **IntersectionObserver** unobserves elements after animation to avoid memory leaks (`.unobserve()` call)
- Media items in carousel have conditional rendering (checks `project.media` array length)

## Key Files & Responsibilities
- **`index.html`** (560 lines): DOM structure, project cards, sections, meta tags
- **`script.js`** (506 lines): All interactivity—project panels, navigation, animations, carousel logic
- **`styles.css`** (1185 lines): All styling, animations, responsive design (currently desktop-only)
- **`old_web/`**: Legacy portfolio version—maintain for "Old Portfolio" link only
- **`Fonts/`**: Custom font files (imported in CSS)

## Critical Patterns to Preserve
- **No external JS libraries**: Vanilla DOM manipulation only
- **CSS variables** for theming (update `:root` for color changes)
- **Semantic HTML5**: Use proper tags (section, header, nav, main, article)
- **Event delegation**: Click handlers added to card elements after DOM load
- **Smooth scroll behavior**: Set on `html` element in CSS, not JS

## Known Limitations & TODOs
- ⚠️ **Not mobile-friendly yet** (acknowledged in README and HTML)
- Old portfolio version exists in `old_web/` directory
- Some project links point to "#" (incomplete)
- CSS is large (1185 lines) - consider modularization if adding major features

## Recommended Agent Tasks
- Enhance mobile responsiveness (major undertaking)
- Add project filter/search functionality
- Implement dark/light theme toggle
- Create build tooling (minification, bundling)
- Add PWA capabilities or service workers
