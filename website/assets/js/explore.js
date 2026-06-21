document.addEventListener("DOMContentLoaded", () => {

    const CREATURES_PER_PAGE = 5;

    const filterBtns      = document.querySelectorAll(".filter-btn");
    const paginationEl    = document.getElementById("explore-pagination");
    const prevBtn         = document.getElementById("page-prev");
    const nextBtn         = document.getElementById("page-next");
    const pageInfo        = document.getElementById("page-info");
    const listingSection  = document.getElementById("creatures-listing");
    
    const creatureTemplate = document.getElementById("creature-template");
    const interpretationTemplate = document.getElementById("interpretation-template");

    let creatureModalInstance;
    const modalEl = document.getElementById("creatureModal");
    if (modalEl) {
        creatureModalInstance = new bootstrap.Modal(modalEl);
    }

    let allEntries    = [];
    let currentFilter = "all";
    let currentPage   = 1;

    // ── Fetch Data and Initialize ──────────────────────────────────────────
    d3.json("assets/data/placeholder_creatures.json").then(data => {
        if (!data || data.length === 0) {
            listingSection.innerHTML = "<p style='text-align:center; color:rgba(207,181,59,0.5);'>No creatures found in the BEASTiary yet.</p>";
            paginationEl.style.display = "none";
            return;
        }
        
        data.forEach(creature => {
            const el = createCreatureElement(creature);
            listingSection.appendChild(el);
        });

        // Re-select entries now that they are in the DOM
        allEntries = Array.from(document.querySelectorAll(".creature-entry"));
        renderPage();
    }).catch(err => {
        console.error("Error loading creatures data:", err);
        listingSection.innerHTML = "<p style='text-align:center; color:red;'>Failed to load creature data.</p>";
    });

    // ── Template Instantiation ───────────────────────────────────────────
    function createCreatureElement(data) {
        const clone = creatureTemplate.content.cloneNode(true);
        const article = clone.querySelector(".creature-entry");
        
        article.id = data.id;
        article.dataset.type = data.type;
        article.dataset.origin = data.origin;

        // Image
        const img = article.querySelector(".creature-img");
        if (data.image.src) {
            img.src = data.image.src;
            img.alt = data.image.alt || "";
        } else {
            img.src = "invalid-url"; 
        }
        article.querySelector(".creature-img-caption").textContent = data.image.caption;

        // Info
        article.querySelector(".creature-name").textContent = data.name;
        article.querySelector(".creature-label-latin").textContent = data.label_latin;
        article.querySelector(".etymology-text").innerHTML = data.etymology;

        // Tags
        const tagsContainer = article.querySelector(".creature-tags");
        data.tags.forEach(t => {
            const span = document.createElement("span");
            span.className = `creature-tag ${t.class}`;
            span.textContent = t.label;
            tagsContainer.appendChild(span);
        });

        // Traits
        const traitsContainer = article.querySelector(".creature-traits");
        data.traits.forEach(t => {
            const div = document.createElement("div");
            div.className = "trait-item";
            div.innerHTML = `<span class="trait-label">${t.label}</span><span class="trait-value">${t.value}</span>`;
            traitsContainer.appendChild(div);
        });

        // Click event to open modal
        const viewBtn = article.querySelector(".view-interp-btn");
        if (viewBtn) {
            viewBtn.addEventListener("click", () => openCreatureModal(data));
        }

        return article;
    }

    // ── Modal Population ─────────────────────────────────────────────────
    function openCreatureModal(data) {
        if (!modalEl) return;

        // Populate basic info
        modalEl.querySelector(".creature-name").textContent = data.name;
        modalEl.querySelector(".creature-label-latin").textContent = data.label_latin;
        modalEl.querySelector(".etymology-text").innerHTML = data.etymology;

        // Populate image
        const img = modalEl.querySelector(".modal-creature-img");
        if (data.image.src) {
            img.src = data.image.src;
            img.alt = data.image.alt || "";
        } else {
            img.src = "invalid-url";
        }
        modalEl.querySelector(".creature-img-caption").textContent = data.image.caption;

        // Populate traits
        const traitsContainer = modalEl.querySelector(".creature-traits");
        traitsContainer.innerHTML = "";
        data.traits.forEach(t => {
            const div = document.createElement("div");
            div.className = "trait-item";
            div.innerHTML = `<span class="trait-label">${t.label}</span><span class="trait-value">${t.value}</span>`;
            traitsContainer.appendChild(div);
        });

        // Populate interpretations
        const interpsContainer = modalEl.querySelector("#modal-interpretations-grid");
        interpsContainer.innerHTML = "";
        const interpsSection = modalEl.querySelector(".creature-interpretations");
        
        if (data.interpretations && data.interpretations.length > 0) {
            interpsSection.style.display = "block";
            data.interpretations.forEach((interp, index) => {
                const iClone = interpretationTemplate.content.cloneNode(true);
                const iCard = iClone.querySelector(".interpretation-card");
                iCard.id = interp.id;
                iCard.querySelector(".interp-source-badge").textContent = interp.badge;
                iCard.querySelector(".interp-card-title").textContent = interp.title;
                iCard.querySelector(".interp-card-body").innerHTML = interp.body;
                iCard.querySelector(".interp-source").innerHTML = interp.source;
                iCard.querySelector(".interp-date").textContent = interp.date;
                
                // Add staggered animation delay inside modal
                iCard.style.transitionDelay = `${index * 60}ms`;
                interpsContainer.appendChild(iCard);
            });
        } else {
            interpsSection.style.display = "none";
        }

        creatureModalInstance.show();
    }

    // ── Derive the set of entries that match the active filter ───────────
    function getVisible() {
        return allEntries.filter(entry =>
            currentFilter === "all" || entry.dataset.type === currentFilter
        );
    }

    // ── Render the correct page of creatures ─────────────────────────────
    function renderPage() {
        if (allEntries.length === 0) return;

        const visible   = getVisible();
        const totalPages = Math.max(1, Math.ceil(visible.length / CREATURES_PER_PAGE));

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1)          currentPage = 1;

        const start = (currentPage - 1) * CREATURES_PER_PAGE;
        const end   = start + CREATURES_PER_PAGE;

        allEntries.forEach(entry => {
            const inFilter  = visible.includes(entry);
            const inPage    = inFilter && visible.indexOf(entry) >= start && visible.indexOf(entry) < end;
            entry.classList.toggle("hidden", !inPage);
        });

        prevBtn.disabled = (currentPage === 1);
        nextBtn.disabled = (currentPage === totalPages);
        pageInfo.textContent = `${currentPage} / ${totalPages}`;
        paginationEl.style.display = (totalPages <= 1) ? "none" : "flex";

        const shownEntries = visible.slice(start, end);
        shownEntries.forEach(entry => {
            entry.querySelectorAll(".interpretation-card").forEach((card, i) => {
                card.style.transitionDelay = `${i * 60}ms`;
            });
        });
    }

    // ── Scroll back to the top of the listing ────────────────────────────
    function scrollToListing() {
        const offset = listingSection.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: offset, behavior: "smooth" });
    }

    // ── Filter bar ───────────────────────────────────────────────────────
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            currentPage   = 1;
            renderPage();
        });
    });

    // ── Pagination buttons ───────────────────────────────────────────────
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            scrollToListing();
        }
    });

    nextBtn.addEventListener("click", () => {
        const totalPages = Math.max(1, Math.ceil(getVisible().length / CREATURES_PER_PAGE));
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            scrollToListing();
        }
    });

    // ── Creature anchor smooth-scroll from URL hash ───────────────────────
    if (window.location.hash) {
        setTimeout(() => {
            const target = document.querySelector(window.location.hash);
            if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 600); // Increased delay to account for fetch
    }

});
