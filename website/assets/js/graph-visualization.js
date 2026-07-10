// BEAST Knowledge Graph & Ontology Visualization
// Powered by D3.js Sunburst Partition
(function () {
  'use strict';

  // 1. Ontology Tree structured to match the true rdfs:subClassOf / rdfs:isDefinedBy structure in ontology.ttl
  // Values represent actual instance counts in the BEAST Knowledge Graph (smtGraph / graph.jsonld).
  // Only leaf nodes carry a `value`; d3.hierarchy.sum() aggregates values up the tree.
  const ontologyTree = {
    name: 'Thing',
    description: 'Root class (owl:Thing) — the implicit superclass of all ontology classes in BEAST.',
    prefix: 'owl',
    children: [
      {
        name: 'Provenance Module',
        prefix: 'beast',
        description: 'Documents the historical and textual footprint of every creature across sources and traditions; also the module in which :Creature itself is defined.',
        children: [
          {
            name: 'Creature',
            prefix: 'beast',
            description: 'The universal, abstract concept of a beast across cultures and eras. Defined in the Provenance Module; ImaginaryBeing and RealAnimal are its two subclasses (from the Biological Module).',
            children: [
              {
                name: 'ImaginaryBeing',
                prefix: 'beast',
                description: 'A creature that does not exist in the natural world, originating from folklore, myth, or literary invention. subClassOf Creature, disjointWith RealAnimal.',
                children: [
                  {
                    name: 'CompositeCreature',
                    prefix: 'beast',
                    description: 'A creature composed of disparate parts, whether those parts are from different animals or distinct materials. subClassOf ImaginaryBeing.',
                    children: [
                      { name: 'HybridCreature', prefix: 'beast', description: 'A composite creature made of anatomical parts from two or more distinct real animals (minQualifiedCardinality 2 on hasPartDerivedFrom). subClassOf CompositeCreature.', value: 17 }
                    ],
                    value: 1
                  }
                ]
              },
              { name: 'RealAnimal', prefix: 'beast', description: 'A scientifically recognized biological animal that exists or existed in the natural world. subClassOf Creature, disjointWith ImaginaryBeing.', value: 17 }
            ]
          },
          { name: 'Interpretation', prefix: 'beast', description: 'A source-specific manifestation or depiction of a creature by a particular author or tradition. Disjoint from both Creature and Source.', value: 172 },
          {
            name: 'Source',
            prefix: 'beast',
            description: 'A primary text, manuscript, bestiary, or artwork attesting to a creature (subClassOf schema:CreativeWork).',
            children: [
              { name: 'Tradition', prefix: 'beast', description: 'A cultural, mythological, or folkloric tradition functioning as a creature\'s origin context, predating or independent of any written source. subClassOf Source.', value: 7 },
              { name: 'Bestiary', prefix: 'beast', description: 'A medieval or modern compendium cataloging animals and imaginary creatures. subClassOf Source.', value: 9 },
              { name: 'LiteraryWork', prefix: 'beast', description: 'A written text, book, poem, or manuscript in which a creature is described, cited, or appears. subClassOf Source.', value: 52 },
              { name: 'VisualArtwork', prefix: 'beast', description: 'A painting, illustration, engraving, or sculpture depicting a creature. subClassOf Source.', value: 22 },
              { name: 'CinematicWork', prefix: 'beast', description: 'A film, television show, or modern media production serving as a modern creature source. subClassOf Source.', value: 9 }
            ]
          },
          { name: 'Citation', prefix: 'beast', description: 'A structured reference to a specific passage within a Source, linked via :extractedFrom / :hasTextualReference — NOT a subclass of Source.', value: 141 },
          { name: 'Etymology', prefix: 'beast', description: 'The linguistic origin and historical derivation of a creature\'s name.', value: 39 },
          { name: 'Genesis', prefix: 'beast', description: 'A source-specific account of a creature\'s origin or birth. Disjoint from Source, Creature, and Interpretation.', value: 20 },
          { name: 'MythologicalFigure', prefix: 'beast', description: 'A deity, hero, personified force, or other agent from myth or tradition. Disjoint from Source, Creature, and Interpretation.', value: 13 },
          { name: 'Person', prefix: 'schema', description: 'An author, illustrator, scholar, or creator associated with a source (schema:Person, linked via schema:creator).', value: 73 }
        ]
      },
      {
        name: 'Biological Module',
        prefix: 'beast',
        description: 'Catalogs physical traits, anatomy, habitats, diets, and abilities of creatures — both real and imaginary.',
        children: [
          { name: 'AnatomicalPart', prefix: 'beast', description: 'An anatomical component of a creature\'s body, such as a head, limb, or tail.', value: 4 },
          { name: 'Ability', prefix: 'beast', description: 'A specific behavior, movement, or activity performed by a creature.', value: 21 },
          {
            name: 'Habitat',
            prefix: 'beast',
            description: 'The natural or mythological environment in which a creature lives or is commonly found.',
            children: [
              {
                name: 'RealWorldPlace',
                prefix: 'beast',
                description: 'A geographic or ecological habitat that exists in the physical world. subClassOf Habitat, disjointWith ImaginaryPlace.',
                children: [
                  { name: 'GeographicPlace', prefix: 'beast', description: 'A specific, real-world named location (e.g. a country, region, city) serving as a creature\'s habitat or origin. subClassOf RealWorldPlace.', value: 5 }
                ],
                value: 9
              },
              { name: 'ImaginaryPlace', prefix: 'beast', description: 'A conceptual, magical, or purely literary space (e.g. the Garden of Eden or Hades). subClassOf Habitat.', value: 15 }
            ]
          }
        ]
      },
      {
        name: 'Symbolic Module',
        prefix: 'beast',
        description: 'The analytical and interpretive layer where depth psychology, anthropology, and myth converge — includes Durand\'s structures of the imaginary.',
        children: [
          { name: 'Archetype', prefix: 'beast', description: 'A universal psychological pattern or symbolic figure instantiated by a creature across manifestations.', value: 55 },
          { name: 'NarrativeFunction', prefix: 'beast', description: 'The specific contextual narrative role performed by a creature within a source (guardian, omen, etc.).', value: 13 }
        ]
      },
    ]
  };

  // 2. Curated Color Palette matching BEAST's rich aesthetic
  // Old Gold (#CFB53B), Dark Khaki (#262A10), Blood Red (#8B0000), Egg Shell (#F4EBD8)
  const colorMap = {
    // Provenance Module — Blood Reds, Crimson, Terracotta & Warm Amber (now also hosts Creature/ImaginaryBeing/RealAnimal)
    'Provenance Module': '#8B0000',
    'Creature': '#DAA520',
    'ImaginaryBeing': '#CFB53B',
    'CompositeCreature': '#B8860B',
    'HybridCreature': '#D4AF37',
    'RealAnimal': '#8C7853',
    'Interpretation': '#A52A2A',
    'Source': '#C0392B',
    'Tradition': '#A569BD',
    'Bestiary': '#922B21',
    'LiteraryWork': '#E67E22',
    'VisualArtwork': '#CD6155',
    'CinematicWork': '#B03A2E',
    'Citation': '#D35400',
    'Etymology': '#8F9E5E',
    'Genesis': '#CB4335',
    'MythologicalFigure': '#DC7633',
    'Person': '#A93226',

    // Biological Module — Olive Greens & Sea Tones
    'Biological Module': '#556B2F',
    'AnatomicalPart': '#7A8B56',
    'Ability': '#6E8B3D',
    'Habitat': '#148F77',
    'RealWorldPlace': '#16A085',
    'GeographicPlace': '#0E6655',
    'ImaginaryPlace': '#2471A3',

    // Symbolic Module — Mystic Purples, Violet & Deep Indigo
    'Symbolic Module': '#4A235A',
    'Archetype': '#6C3483',
    'NarrativeFunction': '#7D3C98'
  };

  // Light segments that require dark text for optimal contrast
  const lightSegments = new Set([
    'ImaginaryBeing', 'HybridCreature', 'Creature', 'Etymology', 'LiteraryWork',
    'Citation', 'Tradition', 'MythologicalFigure', 'GeographicPlace'
  ]);

  // 3. Legend Groups matching the tree's top-level branches
  const legendGroups = [
    {
      label: 'Provenance Module',
      items: ['Creature', 'ImaginaryBeing', 'CompositeCreature', 'HybridCreature', 'RealAnimal', 'Interpretation', 'Source', 'Tradition', 'Bestiary', 'LiteraryWork', 'VisualArtwork', 'CinematicWork', 'Citation', 'Etymology', 'Genesis', 'MythologicalFigure', 'Person']
    },
    {
      label: 'Biological Module',
      items: ['AnatomicalPart', 'Ability', 'Habitat', 'RealWorldPlace', 'GeographicPlace', 'ImaginaryPlace']
    },
    {
      label: 'Symbolic Module',
      items: ['Archetype', 'NarrativeFunction']
    }
  ];

  // 4. Main Chart Initialization
  function initKnowledgeGraphChart() {
    if (!window.d3) return;
    const rootEl = document.getElementById('kg-visualization');
    if (!rootEl) return;

    if (!document.getElementById('kg-chart-container')) {
      rootEl.classList.add('kg-visualization-wrapper');
      rootEl.innerHTML = `
        <div class="kg-chart-layout">
          <div id="kg-chart-container" class="kg-chart-container"></div>
          <div id="kg-legend" class="kg-legend-container"></div>
        </div>
        <div id="kg-tooltip" class="kg-tooltip" style="display: none;"></div>
      `;
    }

    const container = document.getElementById('kg-chart-container');
    const tooltip = document.getElementById('kg-tooltip');
    const legend = document.getElementById('kg-legend');
    if (!container || !tooltip || !legend) return;

    container.innerHTML = '';

    const totalWidth = container.clientWidth || 560;
    const size = Math.min(totalWidth, 1100);
    const radius = size / 2;
    const centerHole = radius * 0.28;
    // Depth 4 needed for Creature -> ImaginaryBeing -> CompositeCreature -> HybridCreature
    // and Habitat -> RealWorldPlace -> GeographicPlace
    const MAX_DEPTH = 4;

    function getInnerR(depth) {
      if (depth === 0) return 0;
      const usable = radius - centerHole;
      return centerHole + ((depth - 1) / MAX_DEPTH) * usable;
    }
    function getOuterR(depth) {
      if (depth === 0) return 0;
      const usable = radius - centerHole;
      return centerHole + (depth / MAX_DEPTH) * usable;
    }

    const root = d3.hierarchy(ontologyTree)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.partition().size([2 * Math.PI, 1])(root);
    const totalInstances = root.value;

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.012))
      .padRadius(centerHole)
      .innerRadius(d => getInnerR(d.depth) + 2)
      .outerRadius(d => getOuterR(d.depth) - 2);

    const svg = d3.select('#kg-chart-container')
      .append('svg')
      .attr('width', size)
      .attr('height', size)
      .attr('viewBox', `${-radius} ${-radius} ${size} ${size}`)
      .attr('aria-label', 'BEAST knowledge graph class distribution sunburst chart');

    // Center background circle
    svg.append('circle')
      .attr('r', centerHole - 3)
      .attr('fill', '#151809')
      .attr('stroke', '#CFB53B')
      .attr('stroke-width', 1.5);

    // Arcs
    const paths = svg.append('g')
      .attr('class', 'kg-arcs')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('path')
      .attr('class', 'kg-arc')
      .attr('fill', d => colorMap[d.data.name] || '#8C7853')
      .attr('fill-opacity', 0.88)
      .attr('stroke', '#151809')
      .attr('stroke-width', 1)
      .attr('d', arc)
      .style('cursor', 'pointer')
      .attr('tabindex', 0);

    // Tooltip Logic
    function showTooltip(event, d) {
      let ancestor = d;
      while (ancestor.depth > 1) { ancestor = ancestor.parent; }

      const isTtLight = lightSegments.has(ancestor.data.name);
      const pct = ((d.value / totalInstances) * 100).toFixed(1);

      let accentColor = '#CFB53B';
      let subTextColor = '#F4EBD8';

      if (isTtLight) {
        accentColor = '#8B0000';
        subTextColor = '#262A10';
      } else if (ancestor.data.name === 'Provenance Module') {
        accentColor = '#F39C12';
        subTextColor = '#FAD7A0';
      } else if (ancestor.data.name === 'Biological Module') {
        accentColor = '#E5C158';
        subTextColor = '#F4EBD8';
      } else if (ancestor.data.name === 'Symbolic Module') {
        accentColor = '#D2B4DE';
        subTextColor = '#E8DFF5';
      }

      const textColor = isTtLight ? '#151809' : '#F4EBD8';
      const displayName = d.data.name;

      const parentName = d.parent && d.parent.depth > 1
        ? `<div class="kg-tt-parent" style="color: ${accentColor}">subClassOf <em style="color: ${isTtLight ? '#151809' : subTextColor}">${d.parent.data.prefix}:${d.parent.data.name}</em></div>`
        : '';

      tooltip.innerHTML = `
        <div class="kg-tt-name" style="color: ${textColor}; border-bottom-color: ${accentColor};">
          <span class="kg-tt-prefix" style="color: ${accentColor}">${d.data.prefix}:</span>${displayName}
        </div>
        ${parentName}
        <div class="kg-tt-stats" style="color: ${textColor}">
          <strong>${d.value.toLocaleString()}</strong> instances
          <span class="kg-tt-pct" style="color: ${accentColor}"> · ${pct}%</span>
        </div>
        <div class="kg-tt-desc" style="color: ${subTextColor}">${d.data.description}</div>
      `;

      tooltip.style.display = 'block';
      moveTooltip(event);
    }

    function moveTooltip(event) {
      let left = event.clientX + 16;
      let top = event.clientY - 10;
      if (left + 280 > window.innerWidth) left = event.clientX - 280;
      if (top + 150 > window.innerHeight) top = event.clientY - 150;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    function hideTooltip() {
      tooltip.style.display = 'none';
    }

    paths
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2).attr('stroke', '#CFB53B');
        showTooltip(event, d);
      })
      .on('mousemove', moveTooltip)
      .on('mouseout', function () {
        d3.select(this).attr('fill-opacity', 0.88).attr('stroke-width', 1).attr('stroke', '#151809');
        hideTooltip();
      })
      .on('focus', function (event, d) {
        d3.select(this).attr('fill-opacity', 1).attr('stroke-width', 2).attr('stroke', '#CFB53B');
        showTooltip(event, d);
      })
      .on('blur', function () {
        d3.select(this).attr('fill-opacity', 0.88).attr('stroke-width', 1).attr('stroke', '#151809');
        hideTooltip();
      });

    // Arc labels
    const labelThresholdAngle = 0.16;
    const charWidth = 6.5;
    const excludedClasses = new Set(['Person', 'Bestiary', 'CinematicWork', 'Tradition', 'CompositeCreature', 'GeographicPlace']);

    svg.append('g')
      .attr('class', 'kg-labels')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(
        root.descendants().filter(d => {
          if (d.depth === 0 || excludedClasses.has(d.data.name)) return false;
          const angleWidth = d.x1 - d.x0;
          const rMid = (getInnerR(d.depth) + getOuterR(d.depth)) / 2;
          const arcLen = rMid * angleWidth;
          return angleWidth > labelThresholdAngle && arcLen > (d.data.name.length * charWidth * 0.65);
        })
      )
      .join('text')
      .attr('dy', '0.35em')
      .attr('font-family', 'Montserrat, sans-serif')
      .attr('font-weight', '500')
      .attr('font-size', d => d.depth === 1 ? `${Math.max(11, Math.round(size / 48))}px` : `${Math.max(9.5, Math.round(size / 56))}px`)
      .attr('fill', d => lightSegments.has(d.data.name) ? '#151809' : '#F4EBD8')
      .attr('transform', d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const r = (getInnerR(d.depth) + getOuterR(d.depth)) / 2;
        const flip = x > 90 && x < 270;
        let rotation = flip ? -90 : 90;
        if (d.data.name === 'Provenance Module' || d.data.name === 'Biological Module') {
          rotation += 180;
        }
        return `rotate(${x - 90}) translate(${r},0) rotate(${rotation})`;
      })
      .text(d => d.data.name);

    // Center Label
    const centre = svg.append('g')
      .attr('class', 'kg-centre-label')
      .attr('text-anchor', 'middle')
      .attr('pointer-events', 'none');

    centre.append('text')
      .attr('class', 'kg-centre-title')
      .attr('dy', '-0.3em')
      .attr('font-family', 'Cinzel, serif')
      .attr('font-size', `${Math.max(14, Math.round(size / 36))}px`)
      .attr('font-weight', '700')
      .attr('fill', '#CFB53B')
      .attr('letter-spacing', '1px')
      .text('BEAST');

    centre.append('text')
      .attr('class', 'kg-centre-sub')
      .attr('dy', '1.1em')
      .attr('font-family', 'Montserrat, sans-serif')
      .attr('font-size', `${Math.max(11, Math.round(size / 48))}px`)
      .attr('fill', '#F4EBD8')
      .text('owl:Thing');

    // Legend Generation
    legend.innerHTML = '';
    legendGroups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'kg-legend-group';

      const groupLabel = document.createElement('div');
      groupLabel.className = 'kg-legend-group-label';
      groupLabel.textContent = group.label;
      groupEl.appendChild(groupLabel);

      const itemsEl = document.createElement('div');
      itemsEl.className = 'kg-legend-items';

      group.items.forEach(name => {
        const node = root.descendants().find(d => d.data.name === name);
        if (!node) return;

        const item = document.createElement('div');
        item.className = 'kg-legend-item';

        const swatch = document.createElement('span');
        swatch.className = 'kg-legend-swatch';
        swatch.style.background = colorMap[name] || '#8C7853';

        const label = document.createElement('span');
        label.className = 'kg-legend-label';
        label.textContent = name;

        const count = document.createElement('span');
        count.className = 'kg-legend-count';
        count.textContent = node.value;

        item.appendChild(swatch);
        item.appendChild(label);
        item.appendChild(count);
        itemsEl.appendChild(item);
      });

      groupEl.appendChild(itemsEl);
      legend.appendChild(groupEl);
    });
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initKnowledgeGraphChart, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initKnowledgeGraphChart);
  } else {
    initKnowledgeGraphChart();
  }

  window.addEventListener('resize', onResize);
})();
