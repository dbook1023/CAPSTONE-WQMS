
document.addEventListener('DOMContentLoaded', function() {
    // Animate feature cards on scroll
    animateOnScroll();
    
    // Smooth scrolling for anchor links
    smoothScroll();

    // Navbar scroll effect
    initNavbarScroll();

    // Fetch and animate stats counters
    fetchAndAnimateStats();
});

/**
 * Fetch latest sensor data and animate counters in the hero section
 */
async function fetchAndAnimateStats() {
    const statsElements = {
        ph: document.getElementById('stat-ph'),
        turbidity: document.getElementById('stat-ntu'),
        temp: document.getElementById('stat-temp'),
        tds: document.getElementById('stat-tds')
    };

    try {
        // We use the API if available, otherwise fallback to defaults
        if (window.API && window.API.sensors) {
            const latest = await window.API.sensors.getLatest();
            if (latest && latest.length > 0) {
                const data = latest[0];
                
                if (statsElements.ph) countUp(statsElements.ph, parseFloat(data.ph), 1);
                if (statsElements.turbidity) countUp(statsElements.turbidity, parseFloat(data.turbidity), 1);
                if (statsElements.temp) countUp(statsElements.temp, parseFloat(data.temperature), 0);
                if (statsElements.tds) countUp(statsElements.tds, parseFloat(data.tds), 0);
                return;
            }
        }
    } catch (error) {
        console.error('Failed to fetch home stats:', error);
    }

    // Fallback/Default values if API fails or no data
    if (statsElements.ph) statsElements.ph.textContent = '--';
    if (statsElements.turbidity) statsElements.turbidity.textContent = '--';
    if (statsElements.temp) statsElements.temp.textContent = '--';
    if (statsElements.tds) statsElements.tds.textContent = '--';
}

function countUp(el, target, decimals) {
    let current = 0;
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = target / steps;
    const stepDuration = duration / steps;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            el.textContent = target.toFixed(decimals);
            clearInterval(timer);
        } else {
            el.textContent = current.toFixed(decimals);
        }
    }, stepDuration);
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
    const navbar = document.getElementById('navbar-placeholder');
    window.addEventListener('scroll', function() {
        if (navbar) {
            if (window.pageYOffset > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

/**
 * Animate feature cards when they come into view
 */
function animateOnScroll() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all feature cards and stat cards
    const animatedElements = document.querySelectorAll('.feature-card, .stat-card');
    animatedElements.forEach((el, index) => {
        // Add staggered animation delay
        el.style.animationDelay = `${index * 0.1}s`;
        observer.observe(el);
    });
}

/**
 * Smooth scrolling for anchor links
 */
function smoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }
            
            // Check if the target element exists
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                // Smooth scroll to target
                const headerOffset = 64; // Height of sticky navbar
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Add parallax effect to hero background circles (optional enhancement)
 */
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const circles = document.querySelectorAll('.hero-circle');
    
    circles.forEach((circle, index) => {
        const speed = 0.5 + (index * 0.2);
        circle.style.transform = `translateY(${scrolled * speed}px)`;
    });
});
