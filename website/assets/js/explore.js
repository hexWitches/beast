document.addEventListener("DOMContentLoaded", () => {

    const CREATURES_PER_PAGE = 9;

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

    const imageMap = {
        "androgino": "androgino.jpg",
        "bull": "bull.jpg",
        "cow": "cow.jpeg",
        "dragon": "dragon.jpg",
        "eagle": "eagle.jpg",
        "elf": "elf.jpg",
        "fairy": "fairy.jpg",
        "fish": "fish.jpeg",
        "giant": "giant.jpg",
        "goat": "goat.jpeg",
        "hippogriff": "hippogriff.jpg",
        "horse": "horse.jpeg",
        "lion": "lion.jpg",
        "mandrake": "mandrake.jpg",
        "manticore": "manticore.jpg",
        "medusa": "medusa.jpg",
        "minotaur": "minotaur.jpg",
        "ogre": "ogre.jpg",
        "pegasus": "pegasus.png",
        "phoenix": "phoenix.jpg",
        "satyr": "satyr.jpg",
        "scorpion": "scorpion.jpeg",
        "siren": "siren.jpeg",
        "snake": "snake.jpg",
        "sphinx": "sphinx.jpg",
        "troll": "troll.jpg",
        "unicorn": "unicorn.jpg",
        "hermaphrodite": "androgino.jpg"
    };

    // Helper functions to handle the JSON-LD structure safely
    function asArray(val) {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    }
    
    function getValue(val) {
        if (!val) return "";
        if (typeof val === "string") return val;
        if (val["@value"]) return val["@value"];
        return "";
    }
    
    function getId(val) {
        if (!val) return null;
        if (typeof val === "string") return val;
        if (val["@id"]) return val["@id"];
        return null;
    }

    // ── Fetch Data and Initialize ──────────────────────────────────────────
    d3.json("assets/data/graph.jsonld").then(rawData => {
        const graphData = rawData["@graph"] || rawData;
        if (!graphData || !Array.isArray(graphData) || graphData.length === 0) {
            listingSection.innerHTML = "<p style='text-align:center; color:rgba(207,181,59,0.5);'>No creatures found in the BEASTiary yet.</p>";
            paginationEl.style.display = "none";
            return;
        }

        // Map graph data by @id for easy lookup
        const graphMap = {};
        graphData.forEach(node => {
            if (node["@id"]) {
                graphMap[node["@id"]] = node;
            }
        });

        const IMAGINARY_TYPES = [
            "beast:HybridCreature",
            "beast:CompositeCreature",
            "beast:ImaginaryCreature",
            "beast:ImaginaryBeing"
        ];

        const creaturesNodes = graphData.filter(node => {
            const types = asArray(node["@type"]);
            return types.includes("beast:Creature")
                || types.includes("beast:RealAnimal")
                || IMAGINARY_TYPES.some(t => types.includes(t));
        });

        const parsedCreatures = creaturesNodes.map(node => {
            const idUri = node["@id"];
            const baseId = idUri.split("_").pop(); // e.g. "dragon" from "beastiary:creature_dragon"
            const types = asArray(node["@type"]);
            const isImaginary = IMAGINARY_TYPES.some(t => types.includes(t));
            const type = isImaginary ? "HybridCreature" : "Mythological";
            
            // Name
            let name = getValue(node["http://www.w3.org/2000/01/rdf-schema#label"]);
            if (!name) name = baseId.charAt(0).toUpperCase() + baseId.slice(1);
            
            const altName = getValue(node["beast:hasAlternativeName"]);
            const label_latin = altName || ""; 

            // Image
            const imgFilename = imageMap[baseId] || `${baseId}.jpg`;
            const image = {
                src: `assets/images/creatures/${imgFilename}`,
                alt: name,
                caption: ""
            };

            // Parts
            const parts = [];
            asArray(node["beast:hasPart"]).forEach(p => {
                const pId = getId(p);
                if (pId) {
                    const pNode = graphMap[pId];
                    if (pNode && pNode["http://www.w3.org/2000/01/rdf-schema#label"]) {
                        parts.push(getValue(pNode["http://www.w3.org/2000/01/rdf-schema#label"]));
                    } else {
                        let partStr = pId.split(":").pop().split("_").join(" ");
                        partStr = partStr.replace(/^part /i, '');
                        parts.push(partStr);
                    }
                }
            });

            // Traits
            const traits = [];
            const addTrait = (predicate, label) => {
                asArray(node[predicate]).forEach(t => {
                    const tId = getId(t);
                    if (tId) {
                        const tNode = graphMap[tId];
                        let val = "";
                        if (tNode && tNode["http://www.w3.org/2000/01/rdf-schema#label"]) {
                            val = getValue(tNode["http://www.w3.org/2000/01/rdf-schema#label"]);
                        } else {
                            val = tId.split(":").pop().replace(/([A-Z])/g, ' $1').trim();
                        }
                        traits.push({ label, value: val });
                    }
                });
            };
            addTrait("beast:hasAbility", "Ability");
            addTrait("beast:hasDiet", "Diet");
            addTrait("beast:hasHabitat", "Habitat");

            // Etymology
            let etymology = "";
            const etyRefs = asArray(node["beast:hasEtymology"]);
            if (etyRefs.length > 0) {
                const etyId = getId(etyRefs[0]);
                const etyNode = graphMap[etyId];
                if (etyNode) {
                    etymology = getValue(etyNode["beast:hasMeaning"]);
                }
            }
            if (!etymology && node["http://www.w3.org/2000/01/rdf-schema#comment"]) {
                etymology = getValue(node["http://www.w3.org/2000/01/rdf-schema#comment"]);
            }

            // Origin
            let origin = "";
            const originRefs = asArray(node["beast:hasOriginContext"]);
            if (originRefs.length > 0) {
                const originId = getId(originRefs[0]);
                origin = originId.split(":").pop().replace(/([A-Z])/g, ' $1').trim();
            }

            // Interpretations
            const interpretations = [];
            graphData.forEach(gNode => {
                if (asArray(gNode["@type"]).includes("beast:Interpretation")) {
                    const ofCreatureRefs = asArray(gNode["beast:ofCreature"]);
                    if (ofCreatureRefs.some(ref => getId(ref) === idUri)) {
                        
                        let interpTitle = getValue(gNode["http://www.w3.org/2000/01/rdf-schema#label"]) || "";
                        let interpBody = getValue(gNode["http://www.w3.org/2000/01/rdf-schema#comment"]);
                        let interpSource = "";
                        let interpDate = "";
                        let interpBadge = "Source";
                        let interpAuthor = "";
                        let interpViaf = "";
                        let interpWikidata = "";
                        let sourceUrl = "";
                        let isVisualOrMovie = false;

                        const sourceRefs = asArray(gNode["beast:appearsIn"]);
                        if (sourceRefs.length > 0) {
                            const sourceId = getId(sourceRefs[0]);
                            const sourceNode = graphMap[sourceId];
                            if (sourceNode) {
                                interpSource = getValue(sourceNode["dcterms:title"]) || getValue(sourceNode["http://www.w3.org/2000/01/rdf-schema#label"]);
                                interpDate = getValue(sourceNode["schema:dateCreated"]);
                                sourceUrl = getValue(sourceNode["schema:url"]);
                                const sourceTypes = asArray(sourceNode["@type"]).map(getId);
                                
                                const specificType = sourceTypes.find(t => t && t.startsWith("beast:") && t !== "beast:Source" && t !== "beast:Citation");
                                if (specificType) {
                                    interpBadge = specificType.split(":").pop().replace(/([A-Z])/g, ' $1').trim();
                                }

                                if (sourceTypes.includes("beast:Movie") || sourceTypes.includes("beast:VisualArtwork") || sourceTypes.includes("beast:Film")) {
                                    isVisualOrMovie = true;
                                }

                                // Extract author name
                                const creatorRefs = asArray(sourceNode["schema:creator"]);
                                if (creatorRefs.length > 0) {
                                    const creatorId = getId(creatorRefs[0]);
                                    const creatorNode = graphMap[creatorId];
                                    if (creatorNode) {
                                        const given = getValue(creatorNode["foaf:givenName"]) || "";
                                        const family = getValue(creatorNode["foaf:familyName"]) || "";
                                        interpAuthor = [given, family].filter(Boolean).join(" ");

                                        // Extract authority file links
                                        const sameAsRefs = asArray(creatorNode["schema:sameAs"]);
                                        sameAsRefs.forEach(ref => {
                                            const refId = getId(ref);
                                            if (refId) {
                                                if (refId.startsWith("http://viaf.org") || refId.startsWith("https://viaf.org")) {
                                                    interpViaf = refId;
                                                } else if (refId.startsWith("wd:")) {
                                                    interpWikidata = "https://www.wikidata.org/wiki/" + refId.slice(3);
                                                }
                                            }
                                        });
                                    }
                                }

                                if (!interpTitle) {
                                    interpTitle = interpSource;
                                }
                            }
                        }

                        // Textual References (also extract source from citation's extractedFrom if needed)
                        const textRefs = asArray(gNode["beast:hasTextualReference"]);
                        if (textRefs.length > 0) {
                            const textId = getId(textRefs[0]);
                            const textNode = graphMap[textId];
                            if (textNode) {
                                if (!interpBody) {
                                    interpBody = getValue(textNode["beast:hasPassageText"]);
                                }
                                // If no source was found via appearsIn, extract it from the citation
                                if (!interpSource) {
                                    const extractedFromRefs = asArray(textNode["beast:extractedFrom"]);
                                    if (extractedFromRefs.length > 0) {
                                        const srcId = getId(extractedFromRefs[0]);
                                        const srcNode = graphMap[srcId];
                                        if (srcNode) {
                                            interpSource = getValue(srcNode["dcterms:title"]) || getValue(srcNode["http://www.w3.org/2000/01/rdf-schema#label"]);
                                            interpDate = getValue(srcNode["schema:dateCreated"]);
                                            sourceUrl = getValue(srcNode["schema:url"]);
                                            const srcTypes = asArray(srcNode["@type"]).map(getId);
                                            const specificType = srcTypes.find(t => t && t.startsWith("beast:") && t !== "beast:Source" && t !== "beast:Citation");
                                            if (specificType) {
                                                interpBadge = specificType.split(":").pop().replace(/([A-Z])/g, ' $1').trim();
                                            }
                                            if (srcTypes.includes("beast:Movie") || srcTypes.includes("beast:VisualArtwork") || srcTypes.includes("beast:Film")) {
                                                isVisualOrMovie = true;
                                            }
                                            const creatorRefs2 = asArray(srcNode["schema:creator"]);
                                            if (creatorRefs2.length > 0 && !interpAuthor) {
                                                const creatorNode2 = graphMap[getId(creatorRefs2[0])];
                                                if (creatorNode2) {
                                                    const given = getValue(creatorNode2["foaf:givenName"]) || "";
                                                    const family = getValue(creatorNode2["foaf:familyName"]) || "";
                                                    interpAuthor = [given, family].filter(Boolean).join(" ");
                                                    asArray(creatorNode2["schema:sameAs"]).forEach(ref => {
                                                        const refId = getId(ref);
                                                        if (refId) {
                                                            if (refId.startsWith("http://viaf.org") || refId.startsWith("https://viaf.org")) interpViaf = refId;
                                                            else if (refId.startsWith("wd:")) interpWikidata = "https://www.wikidata.org/wiki/" + refId.slice(3);
                                                        }
                                                    });
                                                }
                                            }
                                            if (!interpTitle) interpTitle = interpSource;
                                        }
                                    }
                                }
                            }
                        }
                        // Convert / to line breaks in passage text
                        if (interpBody) {
                            interpBody = interpBody.replace(/\s*\/\s*/g, '<br>');
                        }

                        // Divergent parts
                        const formatDiv = ref => {
                            const pId = getId(ref);
                            if (!pId) return null;
                            const pNode = graphMap[pId];
                            return (pNode && pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                ? getValue(pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                : pId.split(":").pop().replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ').replace(/^part /i, '').replace(/^ability /i, '');
                        };
                        const addedParts = asArray(gNode["beast:additionalPart"]).map(formatDiv).filter(Boolean);
                        const removedParts = asArray(gNode["beast:removedPart"]).map(formatDiv).filter(Boolean);
                        const addedAbilities = asArray(gNode["beast:additionalAbility"]).map(formatDiv).filter(Boolean);
                        const removedAbilities = asArray(gNode["beast:removedAbility"]).map(formatDiv).filter(Boolean);

                        interpretations.push({
                            id: gNode["@id"],
                            badge: interpBadge,
                            title: interpTitle,
                            body: interpBody || "No description provided.",
                            author: interpAuthor,
                            viafUrl: interpViaf,
                            wikidataUrl: interpWikidata,
                            date: interpDate,
                            sourceUrl: isVisualOrMovie ? sourceUrl : "",
                            divergent: { addedParts, removedParts, addedAbilities, removedAbilities }
                        });
                    }
                }
            });

            return {
                id: "creature-" + baseId,
                type,
                origin,
                image,
                name,
                label_latin,
                etymology,
                tags: [],
                parts,
                traits,
                interpretations
            };
        });

        // Alphabetize creatures by name
        parsedCreatures.sort((a, b) => a.name.localeCompare(b.name));
        
        parsedCreatures.forEach(creature => {
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

        // Name & Latin
        article.querySelector(".creature-name").textContent = data.name;
        const latinEl = article.querySelector(".creature-label-latin");
        if (data.label_latin) {
            latinEl.textContent = data.label_latin;
        } else {
            latinEl.style.display = "none";
        }

        const partsContainer = article.querySelector(".creature-parts");
        const parts = data.parts || [];
        if (parts.length > 0) {
            parts.forEach(p => {
                const span = document.createElement("span");
                span.className = "creature-part-tag";
                // Capitalize first letter
                span.textContent = p.charAt(0).toUpperCase() + p.slice(1);
                partsContainer.appendChild(span);
            });
        } else {
            partsContainer.style.display = "none";
        }

        // View button — always opens the modal
        const viewBtn = article.querySelector(".view-interp-btn");
        if (viewBtn) {
            viewBtn.addEventListener("click", () => openCreatureModal(data));
        }

        return article;
    }

    // ── Modal Population ─────────────────────────────────────────────────
    function openCreatureModal(data) {
        if (!modalEl) return;

        // Populate name & latin in header
        modalEl.querySelector(".creature-name").textContent = data.name;
        const modalLatin = modalEl.querySelector(".modal-latin");
        if (modalLatin) {
            modalLatin.textContent = data.label_latin || "";
            modalLatin.style.display = data.label_latin ? "block" : "none";
        }

        // Populate image
        const img = modalEl.querySelector(".modal-creature-img");
        if (data.image.src) {
            img.src = data.image.src;
            img.alt = data.image.alt || "";
        } else {
            img.src = "invalid-url";
        }
        modalEl.querySelector(".creature-img-caption").textContent = data.image.caption || "";

        // Etymology block
        const etymologyBlock = modalEl.querySelector("#modal-etymology");
        const etymologyText  = etymologyBlock ? etymologyBlock.querySelector(".etymology-text") : null;
        if (etymologyBlock) {
            if (data.etymology) {
                etymologyText.innerHTML = data.etymology;
                etymologyBlock.style.display = "block";
            } else {
                etymologyBlock.style.display = "none";
            }
        }

        // Populate traits
        const traitsContainer = modalEl.querySelector(".creature-traits");
        traitsContainer.innerHTML = "";
        if (data.traits && data.traits.length > 0) {
            data.traits.forEach(t => {
                const div = document.createElement("div");
                div.className = "trait-item";
                div.innerHTML = `<span class="trait-label">${t.label}</span><span class="trait-value">${t.value}</span>`;
                traitsContainer.appendChild(div);
            });
        }

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
                
                const authorBlockEl = iCard.querySelector(".interp-author-block");
                const authorEl = iCard.querySelector(".interp-author");
                if (interp.author) {
                    authorEl.textContent = interp.author;
                    authorBlockEl.style.display = "block";
                }

                const authorityEl = iCard.querySelector(".interp-authority");
                const viafEl = iCard.querySelector(".interp-viaf");
                const wikidataEl = iCard.querySelector(".interp-wikidata");
                if (interp.viafUrl || interp.wikidataUrl) {
                    authorityEl.style.display = "flex";
                    if (interp.viafUrl) {
                        viafEl.href = interp.viafUrl;
                        viafEl.style.display = "inline-block";
                    }
                    if (interp.wikidataUrl) {
                        wikidataEl.href = interp.wikidataUrl;
                        wikidataEl.style.display = "inline-block";
                    }
                }

                iCard.querySelector(".interp-date").textContent = interp.date;
                
                const urlEl = iCard.querySelector(".interp-url");
                if (interp.sourceUrl) {
                    urlEl.href = interp.sourceUrl;
                    urlEl.style.display = "inline-block";
                }

                const divEl = iCard.querySelector(".interp-divergent");
                const divList = iCard.querySelector(".divergent-list");
                let divItems = [];
                interp.divergent.addedParts.forEach(p => divItems.push(`<li>Added part: <span style="color:var(--egg-shell);">${p}</span></li>`));
                interp.divergent.removedParts.forEach(p => divItems.push(`<li>Removed part: <span style="color:var(--egg-shell);">${p}</span></li>`));
                interp.divergent.addedAbilities.forEach(p => divItems.push(`<li>Added ability: <span style="color:var(--egg-shell);">${p}</span></li>`));
                interp.divergent.removedAbilities.forEach(p => divItems.push(`<li>Removed ability: <span style="color:var(--egg-shell);">${p}</span></li>`));
                
                if (divItems.length > 0) {
                    divList.innerHTML = divItems.join("");
                    divEl.style.display = "block";
                }

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
