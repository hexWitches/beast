document.addEventListener("DOMContentLoaded", () => {
    // 1. Scroll-Reveal Animation for Footer & other components
    const revealElements = document.querySelectorAll('.content-to-reveal');
    
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -40px 0px"
    };
    
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
                observer.unobserve(entry.target); // Reveal only once
            }
        });
    }, observerOptions);
    
    revealElements.forEach(element => {
        // Initialize reveal styles
        element.style.opacity = '0';
        element.style.transform = 'translateY(40px)';
        element.style.transition = 'opacity 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1)';
        revealOnScroll.observe(element);
    });

    // Create a dynamic stylesheet rule for the visible state
    const style = document.createElement('style');
    style.innerHTML = `
        .reveal-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // 2. Responsive Navbar Hamburger Toggle
    const hamburgerToggle = document.getElementById('hamburger-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (hamburgerToggle && navMenu) {
        hamburgerToggle.addEventListener('click', () => {
            hamburgerToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close menu when a link is clicked
        const navLinks = navMenu.querySelectorAll('.nav-link-item');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                hamburgerToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // 3. Scroll to Top Button
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });
        
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

});
