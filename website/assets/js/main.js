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

// ----------------------------- //
// IMAGE CLICK AND POP UP
let currentZoom = 1;
let isDragging = false;
let startX, startY, translateX = 0, translateY = 0;

document.addEventListener('DOMContentLoaded', function() {
    const zoomableImages = document.querySelectorAll('.zoomable-image');
    zoomableImages.forEach(img => {
        img.addEventListener('click', function() {
            openModal(this);
        });
    });

    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (document.getElementById('imageModal').style.display === 'block') {
            if (e.key === 'Escape') {
                closeModal();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        }
    });
});

function openModal(img) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    modal.style.display = 'block';
    modalImg.src = img.dataset.zoomSrc || img.src;
    modalImg.alt = img.alt;
    
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();
    
    addDragFunctionality(modalImg);
}

function closeModal() {
    document.getElementById('imageModal').style.display = 'none';
}

function zoomIn() {
    currentZoom = Math.min(currentZoom * 1.2, 5);
    updateImageTransform();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom / 1.2, 0.5);
    updateImageTransform();
}

function resetZoom() {
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    updateImageTransform();
}

function updateImageTransform() {
    const modalImg = document.getElementById('modalImage');
    modalImg.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
}

function addDragFunctionality(img) {
    img.addEventListener('mousedown', startDrag);
    img.addEventListener('mousemove', drag);
    img.addEventListener('mouseup', endDrag);
    img.addEventListener('mouseleave', endDrag);
    
    // Touch events for mobile
    img.addEventListener('touchstart', startDrag);
    img.addEventListener('touchmove', drag);
    img.addEventListener('touchend', endDrag);
}

function startDrag(e) {
    if (currentZoom > 1) {
        isDragging = true;
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        startX = clientX - translateX;
        startY = clientY - translateY;
        e.preventDefault();
    }
}

function drag(e) {
    if (isDragging && currentZoom > 1) {
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        translateX = clientX - startX;
        translateY = clientY - startY;
        updateImageTransform();
        e.preventDefault();
    }
}

function endDrag() {
    isDragging = false;
}

// Mouse wheel zoom
const modalImageEl = document.getElementById('modalImage');
if (modalImageEl) {
    modalImageEl.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });
}
// ----------------------------- //