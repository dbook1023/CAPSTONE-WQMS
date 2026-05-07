/* research.js logic */
document.addEventListener('DOMContentLoaded', function() {
    // Reveal animations on scroll
    initRevealAnimations();
});

function initRevealAnimations() {
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
    
    // Target tech items, methodology steps, and parameter cards
    const animatedElements = document.querySelectorAll('.tech-item, .step, .param-card');
    
    animatedElements.forEach((el, index) => {
        // Initial state via JS if not set in CSS
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        
        // Add staggered delay
        el.style.transitionDelay = `${(index % 3) * 0.1}s`;
        
        observer.observe(el);
    });

    // Handle the 'animate' class toggle
    const style = document.createElement('style');
    style.textContent = `
        .tech-item.animate, .step.animate, .param-card.animate {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
}
