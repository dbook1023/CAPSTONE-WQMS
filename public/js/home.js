
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Mobile menu functionality
    setupMobileMenu();
    
    // Animate feature cards on scroll
    animateOnScroll();
    
    // Smooth scrolling for anchor links
    smoothScroll();
});

/**
 * Setup mobile menu toggle
 */
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        
        if (this.classList.contains('active')) {
            // Show mobile menu
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '4rem';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.backgroundColor = 'white';
            navLinks.style.padding = '1rem';
            navLinks.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            navLinks.style.zIndex = '999';
        } else {
            // Hide mobile menu
            navLinks.style.display = 'none';
        }
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-content')) {
            mobileMenuBtn.classList.remove('active');
            if (window.innerWidth < 768) {
                navLinks.style.display = 'none';
            }
        }
    });
    
    // Close menu when clicking on a link
    const navLinkElements = document.querySelectorAll('.nav-link');
    navLinkElements.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                mobileMenuBtn.classList.remove('active');
                navLinks.style.display = 'none';
            }
        });
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            // Desktop view - show nav links
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'row';
            navLinks.style.position = 'static';
            navLinks.style.padding = '0';
            navLinks.style.boxShadow = 'none';
        } else {
            // Mobile view - hide nav links if menu is not active
            if (!mobileMenuBtn.classList.contains('active')) {
                navLinks.style.display = 'none';
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
    
    // Observe all feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        // Add staggered animation delay
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
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
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
    }
    
    lastScroll = currentScroll;
});
