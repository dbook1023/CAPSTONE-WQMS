// Contact Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Mobile menu
    setupMobileMenu();
    
    // Scroll animations
    setupScrollAnimations();
});

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        
        if (this.classList.contains('active')) {
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
            navLinks.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-content')) {
            mobileMenuBtn.classList.remove('active');
            if (window.innerWidth < 768) {
                navLinks.style.display = 'none';
            }
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'row';
            navLinks.style.position = 'static';
            navLinks.style.padding = '0';
            navLinks.style.boxShadow = 'none';
        } else {
            if (!mobileMenuBtn.classList.contains('active')) {
                navLinks.style.display = 'none';
            }
        }
    });
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    const animatedElements = document.querySelectorAll('.team-card, .adviser-card');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}