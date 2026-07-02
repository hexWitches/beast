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
        "ant": "ant.jpeg",
        "antlion": "mirmicoleone.jpg",
        "basilisk": "basilisk.jpg",
        "bull": "bull.jpg",
        "centaur": "centaur.jpeg",
        "chimera": "chimera.jpeg",
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
        "mirmicoleone": "mirmicoleone.jpg",
        "ogre": "ogre.jpg",
        "onager": "onager.jpeg",
        "onocentaur": "onocentaur.jpg",
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
            listingSection.innerHTML = "<p class=\'empty-listing-msg\'>No creatures found in the BEASTiary yet.</p>";
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
                            val = tId.split(":").pop().replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');
                            val = val.replace(/\s*(diet|habitat|ability)\s*/gi, ' ').trim();
                            val = val.charAt(0).toUpperCase() + val.slice(1);
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

            // Creature-level Symbolic meanings
            const formatDurandCreature = (str) => {
                if (!str) return "";
                str = str.replace(/symbol|structure|regime/gi, '');
                return str.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
            };

            const getCreatureDurandItems = (predicate) => {
                return asArray(node[predicate]).map(ref => {
                    const sId = getId(ref);
                    if (!sId) return null;
                    const sNode = graphMap[sId];
                    const rawLabel = sNode ? getValue(sNode["http://www.w3.org/2000/01/rdf-schema#label"]) : "";
                    let label = rawLabel || sId.split(":").pop();
                    label = label.replace(/_(symbol|structure|regime)$/i, '').replace(/_/g, '');
                    label = formatDurandCreature(label);
                    const meaning = sNode ? getValue(sNode["beast:hasMeaning"]) || getValue(sNode["http://www.w3.org/2000/01/rdf-schema#comment"]) : "";
                    return { label: label.charAt(0).toUpperCase() + label.slice(1), meaning };
                }).filter(Boolean);
            };

            const creatureDurandSymbols = getCreatureDurandItems("beast:embodiesImaginarySymbol");
            const creatureDurandStructures = getCreatureDurandItems("beast:belongsToImaginaryStructure");
            const creatureDurandRegimes = getCreatureDurandItems("beast:isGovernedBy");

            const getCreatureSymbolicItems = (predicate) => {
                return asArray(node[predicate]).map(ref => {
                    const aId = getId(ref);
                    if (!aId) return null;
                    const aNode = graphMap[aId];
                    const rawLabel = aNode ? getValue(aNode["http://www.w3.org/2000/01/rdf-schema#label"]) : "";
                    let label = rawLabel || aId.split(":").pop();
                    label = label.replace(/_(archetype|function)$/i, '').replace(/_/g, ' ');
                    label = label.replace(/\s*(archetype|function)\s*/gi, ' ').trim();
                    const meaning = aNode ? getValue(aNode["beast:hasMeaning"]) : "";
                    return { label: label.charAt(0).toUpperCase() + label.slice(1), meaning };
                }).filter(Boolean);
            };
            
            const creatureArchetypes = getCreatureSymbolicItems("beast:embodiesArchetype");
            const creatureNarratives = getCreatureSymbolicItems("beast:hasNarrativeFunction");

            // Interpretations
            const interpretations = [];
            
            // extract the durand reference / comment
            const creatureDescription = getValue(node["http://www.w3.org/2000/01/rdf-schema#comment"]);

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
                        let artworkImageSrc = "";
                        let isCinematic = false;

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

                                if (sourceTypes.includes("beast:CinematicWork") || sourceTypes.includes("beast:VisualArtwork")) {
                                    isVisualOrMovie = true;
                                }

                                // Derive artwork image path from source @id for VisualArtwork & Cinematic works
                                if (sourceTypes.includes("beast:VisualArtwork")) {
                                    const artworkKey = sourceId.split(":").pop(); // e.g. "source_oedipus_moureau"
                                    artworkImageSrc = `assets/images/visual_artworks/${artworkKey}`;
                                } else if (sourceTypes.includes("beast:CinematicWork")) {
                                    const cinematicKey = sourceId.split(":").pop();
                                    artworkImageSrc = `assets/images/cinematic_works/${cinematicKey}`;
                                    isCinematic = true;
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

                                            // Derive artwork image path from source @id for VisualArtwork (fallback path)
                                            if (srcTypes.includes("beast:VisualArtwork") && !artworkImageSrc) {
                                                const artworkKey = srcId.split(":").pop();
                                                artworkImageSrc = `assets/images/visual_artworks/${artworkKey}`;
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
                            let val = (pNode && pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                ? getValue(pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                : pId.split(":").pop().replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');
                            val = val.replace(/\s*(part|ability)\s*/gi, ' ').trim();
                            return val.charAt(0).toUpperCase() + val.slice(1);
                        };
                        const addedParts = asArray(gNode["beast:additionalPart"]).map(formatDiv).filter(Boolean);
                        const removedParts = asArray(gNode["beast:removedPart"]).map(formatDiv).filter(Boolean);
                        const addedAbilities = asArray(gNode["beast:additionalAbility"]).map(formatDiv).filter(Boolean);
                        const removedAbilities = asArray(gNode["beast:removedAbility"]).map(formatDiv).filter(Boolean);

                        const formatAlt = ref => {
                            const pId = getId(ref);
                            if (!pId) return null;
                            const pNode = graphMap[pId];
                            let val = (pNode && pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                ? getValue(pNode["http://www.w3.org/2000/01/rdf-schema#label"]) 
                                : pId.split(":").pop().replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');
                            val = val.replace(/\s*(diet|habitat)\s*/gi, ' ').trim();
                            return val.charAt(0).toUpperCase() + val.slice(1);
                        };
                        const altDiets = asArray(gNode["beast:alternativeDiet"]).map(formatAlt).filter(Boolean);
                        const altHabitats = asArray(gNode["beast:alternativeHabitat"]).map(formatAlt).filter(Boolean);

                        // ── Symbolic data ──────────────────────────────────
                        // Archetype
                        const archetypeRefs = asArray(gNode["beast:embodiesArchetype"]);
                        const archetypes = archetypeRefs.map(ref => {
                            const aId = getId(ref);
                            if (!aId) return null;
                            const aNode = graphMap[aId];
                            const rawLabel = aNode ? getValue(aNode["http://www.w3.org/2000/01/rdf-schema#label"]) : "";
                            let label = rawLabel || aId.split(":").pop();
                            label = label.replace(/_(archetype)$/i, '').replace(/_/g, ' ');
                            label = label.replace(/\s*(archetype)\s*/gi, ' ').trim();
                            const meaning = aNode ? getValue(aNode["beast:hasMeaning"]) : "";
                            return { label: label.charAt(0).toUpperCase() + label.slice(1), meaning };
                        }).filter(Boolean);

                        // Narrative function
                        const narrativeFnRefs = asArray(gNode["beast:hasNarrativeFunction"]);
                        const narrativeFunctions = narrativeFnRefs.map(ref => {
                            const nId = getId(ref);
                            if (!nId) return null;
                            const nNode = graphMap[nId];
                            const rawLabel = nNode ? getValue(nNode["http://www.w3.org/2000/01/rdf-schema#label"]) : "";
                            let label = rawLabel || nId.split(":").pop();
                            label = label.replace(/_(function)$/i, '').replace(/_/g, ' ');
                            label = label.replace(/\s*(function)\s*/gi, ' ').trim();
                            const meaning = nNode ? getValue(nNode["beast:hasMeaning"]) : "";
                            return { label: label.charAt(0).toUpperCase() + label.slice(1), meaning };
                        }).filter(Boolean);

                        // Durand imaginary items (symbols, structures, regimes)
                        const formatDurand = (str) => {
                            if (!str) return "";
                            str = str.replace(/symbol|structure|regime/gi, '');
                            return str.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
                        };

                        const getDurandItems = (predicate) => {
                            return asArray(gNode[predicate]).map(ref => {
                                const sId = getId(ref);
                                if (!sId) return null;
                                const sNode = graphMap[sId];
                                const rawLabel = sNode ? getValue(sNode["http://www.w3.org/2000/01/rdf-schema#label"]) : "";
                                let label = rawLabel || sId.split(":").pop();
                                // if it's like "TeriomorphicSymbol", remove "_symbol", "_structure", "_regime" at the end if present, then format
                                label = label.replace(/_(symbol|structure|regime)$/i, '').replace(/_/g, '');
                                label = formatDurand(label);
                                const meaning = sNode ? getValue(sNode["beast:hasMeaning"]) || getValue(sNode["http://www.w3.org/2000/01/rdf-schema#comment"]) : "";
                                return { label: label.charAt(0).toUpperCase() + label.slice(1), meaning };
                            }).filter(Boolean);
                        };

                        const durandSymbols = getDurandItems("beast:embodiesImaginarySymbol");
                        const durandStructures = getDurandItems("beast:belongsToImaginaryStructure");
                        const durandRegimes = getDurandItems("beast:isGovernedBy");

                        interpretations.push({
                            id: gNode["@id"],
                            badge: interpBadge,
                            title: interpTitle,
                            personalName: getValue(gNode["beast:hasPersonalName"]),
                            body: interpBody || (isVisualOrMovie ? "" : "No description provided."),
                            author: interpAuthor,
                            viafUrl: interpViaf,
                            wikidataUrl: interpWikidata,
                            date: interpDate,
                            sourceUrl: isVisualOrMovie ? sourceUrl : "",
                            artworkImageSrc: artworkImageSrc || "",
                            isCinematic: isCinematic || false,
                            divergent: { addedParts, removedParts, addedAbilities, removedAbilities, altDiets, altHabitats },
                            symbolic: { archetypes, narrativeFunctions, durandSymbols, durandStructures, durandRegimes }
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
                interpretations,
                symbolic: { 
                    description: creatureDescription,
                    archetypes: creatureArchetypes,
                    narrativeFunctions: creatureNarratives,
                    durandSymbols: creatureDurandSymbols, 
                    durandStructures: creatureDurandStructures, 
                    durandRegimes: creatureDurandRegimes 
                }
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
        listingSection.innerHTML = "<p class=\'error-listing-msg\'>Failed to load creature data.</p>";
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

        // Populate creature symbolic meanings
        const creatureSymbolicContainer = modalEl.querySelector(".creature-symbolic-container");
        if (creatureSymbolicContainer) {
            creatureSymbolicContainer.innerHTML = "";
            const { description, archetypes, narrativeFunctions, durandSymbols, durandStructures, durandRegimes } = data.symbolic;
            const hasAny = archetypes.length > 0 || narrativeFunctions.length > 0 || durandSymbols.length > 0 || durandStructures.length > 0 || durandRegimes.length > 0 || description;
            
            if (hasAny) {
                let symbolHtml = '';
                const makeGroup = (items, categoryLabel, pillClass) => {
                    if (!items.length) return '';
                    const pills = items.map(item => {
                        const tipAttr = item.meaning ? ` title="${item.meaning.replace(/"/g, '&quot;')}"` : '';
                        return `<span class="symbolic-pill ${pillClass}"${tipAttr}>${item.label}</span>`;
                    }).join('');
                    return `<div class="symbolic-group"><span class="symbolic-row-label">${categoryLabel}</span><div class="symbolic-pills">${pills}</div></div>`;
                };

                symbolHtml += makeGroup(archetypes, 'Archetype', 'pill-archetype');
                symbolHtml += makeGroup(narrativeFunctions, 'Narrative', 'pill-narrative');
                symbolHtml += makeGroup(durandRegimes, 'Regime', 'pill-durand');
                symbolHtml += makeGroup(durandStructures, 'Structure', 'pill-durand');
                symbolHtml += makeGroup(durandSymbols, 'Symbol', 'pill-durand');
                symbolHtml = `<div class="symbolic-groups">${symbolHtml}</div>`;

                let descHtml = description ? `<p class="symbolic-description">${description}</p>` : '';
                creatureSymbolicContainer.innerHTML = `<h5 class="symbolic-heading">Symbolic Meaning</h5><div class="symbolic-body-static">${symbolHtml}${descHtml}</div>`;
                creatureSymbolicContainer.style.display = "block";
            } else {
                creatureSymbolicContainer.style.display = "none";
            }
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
                
                const personalNameEl = iCard.querySelector(".interp-personal-name");
                if (interp.personalName) {
                    personalNameEl.textContent = interp.personalName;
                    personalNameEl.style.display = "block";
                } else {
                    personalNameEl.style.display = "none";
                }

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

                // Artwork image (VisualArtwork sources only)
                const artworkImgWrap = iCard.querySelector(".interp-artwork-img-wrap");
                const artworkImgEl   = iCard.querySelector(".interp-artwork-img");
                if (interp.artworkImageSrc && artworkImgWrap && artworkImgEl) {
                    // We don't know the extension ahead of time, so try to load it and
                    // fall back through jpg → jpeg → png on error.
                    const bases = [interp.artworkImageSrc + ".jpg",
                                   interp.artworkImageSrc + ".jpeg",
                                   interp.artworkImageSrc + ".png"];
                    let attempt = 0;
                    const tryLoad = () => {
                        if (attempt >= bases.length) {
                            artworkImgWrap.style.display = "none";
                            return;
                        }
                        artworkImgEl.src = bases[attempt];
                        artworkImgEl.alt = interp.title || "Visual artwork";
                    };
                    artworkImgEl.onerror = () => { attempt++; tryLoad(); };
                    artworkImgEl.onload  = () => { 
                        artworkImgWrap.style.display = "block"; 
                        // Re-check overflow since the new image took up space
                        const bodyContainer = iCard.querySelector('.interp-body-container');
                        const btn = iCard.querySelector('.read-more-btn');
                        if (bodyContainer && btn && bodyContainer.scrollHeight > bodyContainer.clientHeight + 2) {
                            btn.style.display = 'block';
                        }
                    };
                    
                    if (interp.isCinematic) {
                        artworkImgEl.classList.add("cinematic-img");
                    }
                    
                    artworkImgWrap.style.display = "none"; // hidden until loaded
                    tryLoad();
                } else if (artworkImgWrap) {
                    artworkImgWrap.style.display = "none";
                }

                iCard.querySelector(".interp-date").textContent = interp.date;
                
                const urlEl = iCard.querySelector(".interp-url");
                if (interp.sourceUrl) {
                    urlEl.href = interp.sourceUrl;
                    urlEl.style.display = "inline-block";
                }

                const divEl = iCard.querySelector(".interp-divergent");
                const divBody = iCard.querySelector(".divergent-body");
                const divToggle = iCard.querySelector(".divergent-toggle");

                const makeDivPills = (items, categoryLabel, pillClass) => {
                    if (!items.length) return '';
                    const pills = items.map(item => `<span class="symbolic-pill ${pillClass}">${item}</span>`).join('');
                    return `<div class="symbolic-row"><span class="symbolic-row-label">${categoryLabel}</span><div class="symbolic-pills">${pills}</div></div>`;
                };

                let divHtml = '';
                divHtml += makeDivPills(interp.divergent.addedParts, 'Added', 'pill-added');
                divHtml += makeDivPills(interp.divergent.removedParts, 'Removed', 'pill-removed');
                divHtml += makeDivPills(interp.divergent.addedAbilities, 'Ability+', 'pill-added');
                divHtml += makeDivPills(interp.divergent.removedAbilities, 'Ability−', 'pill-removed');
                divHtml += makeDivPills(interp.divergent.altDiets, 'Diet', 'pill-added');
                divHtml += makeDivPills(interp.divergent.altHabitats, 'Habitat', 'pill-added');

                if (divHtml) {
                    divBody.innerHTML = divHtml;
                    divEl.style.display = "block";
                    if (divToggle) {
                        divToggle.addEventListener('click', () => {
                            const isOpen = divEl.classList.toggle('symbolic-open');
                            divToggle.setAttribute('aria-expanded', isOpen);
                        });
                    }
                }

                // ── Symbolic section ──────────────────────────────────────
                const symbolicEl = iCard.querySelector(".interp-symbolic");
                const symbolicToggle = iCard.querySelector(".interp-symbolic .symbolic-toggle");
                const symbolicBody = iCard.querySelector(".interp-symbolic .symbolic-body");

                if (symbolicEl && symbolicBody && interp.symbolic) {
                    const { archetypes, narrativeFunctions, durandSymbols, durandStructures, durandRegimes } = interp.symbolic;
                    const hasAny = archetypes.length > 0 || narrativeFunctions.length > 0 || durandSymbols.length > 0 || durandStructures.length > 0 || durandRegimes.length > 0;

                    if (hasAny) {
                        let symbolHtml = '';

                        const makePills = (items, categoryLabel, pillClass) => {
                            if (!items.length) return '';
                            const pills = items.map(item => {
                                const tipAttr = item.meaning ? ` title="${item.meaning.replace(/"/g, '&quot;')}"` : '';
                                return `<span class="symbolic-pill ${pillClass}"${tipAttr}>${item.label}</span>`;
                            }).join('');
                            return `<div class="symbolic-row"><span class="symbolic-row-label">${categoryLabel}</span><div class="symbolic-pills">${pills}</div></div>`;
                        };

                        symbolHtml += makePills(archetypes, 'Archetype', 'pill-archetype');
                        symbolHtml += makePills(narrativeFunctions, 'Narrative', 'pill-narrative');
                        symbolHtml += makePills(durandRegimes, 'Regime', 'pill-durand');
                        symbolHtml += makePills(durandStructures, 'Structure', 'pill-durand');
                        symbolHtml += makePills(durandSymbols, 'Symbol', 'pill-durand');

                        symbolicBody.innerHTML = symbolHtml;
                        symbolicEl.style.display = 'block';

                        if (symbolicToggle) {
                            symbolicToggle.addEventListener('click', () => {
                                const isOpen = symbolicEl.classList.toggle('symbolic-open');
                                symbolicToggle.setAttribute('aria-expanded', isOpen);
                            });
                        }
                    }
                }

                // Read more button logic
                const readMoreBtn = iCard.querySelector(".read-more-btn");
                if (readMoreBtn) {
                    readMoreBtn.addEventListener("click", () => {
                        const isExpanded = iCard.classList.toggle("expanded");
                        readMoreBtn.textContent = isExpanded ? "Read less" : "Read more";
                        readMoreBtn.setAttribute("aria-expanded", isExpanded);
                        if (isExpanded) {
                            iCard.style.height = 'auto';
                        } else {
                            iCard.style.height = '';
                        }
                    });
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

    // ── Check overflow for Read More button when modal is shown ───────────
    if (modalEl) {
        modalEl.addEventListener('shown.bs.modal', function () {
            const cards = this.querySelectorAll('.interpretation-card');
            cards.forEach(card => {
                const bodyContainer = card.querySelector('.interp-body-container');
                const btn = card.querySelector('.read-more-btn');
                if (bodyContainer && btn) {
                    // Check if the container's scrollHeight is greater than its clientHeight
                    // We add a small tolerance (e.g., 2px) to prevent precision issues
                    if (bodyContainer.scrollHeight > bodyContainer.clientHeight + 2) {
                        btn.style.display = 'block';
                    } else {
                        btn.style.display = 'none';
                    }
                }
            });
        });
    }

});
