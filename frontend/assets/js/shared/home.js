
document.addEventListener('DOMContentLoaded', function() {
    // Animate feature cards on scroll
    animateOnScroll();
    
    // Smooth scrolling for anchor links
    smoothScroll();

    // Navbar scroll effect
    initNavbarScroll();

    // Animate stats counters
    animateCounters();
});

/**
 * Animate stats counters in the hero section
 */
function animateCounters() {
    const stats = [
        { id: 'stat-ph', target: 7.2, decimals: 1 },
        { id: 'stat-ntu', target: 2.3, decimals: 1 },
        { id: 'stat-temp', target: 24, decimals: 0 },
        { id: 'stat-tds', target: 125, decimals: 0 }
    ];

    stats.forEach(stat => {
        const el = document.getElementById(stat.id);
        if (el) {
            countUp(el, stat.target, stat.decimals);
        }
    });
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

/**
 * Navbar scroll effect
 */
let lastScroll = 0;
const navbar = document.getElementById('navbar-placeholder');

window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;
    
    if (navbar) {
        if (currentScroll > 100) {
            navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
        }
    }
    
    lastScroll = currentScroll;
});
