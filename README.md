# BEAST

The **BEAST ontology** is an RDF/OWL ontology designed to provide a formal representation of creatures, whether real or imaginary, together with their textual attestations, morphological characteristics, etymological origins, and symbolic meanings. It models entities through a structured set of classes and properties, while a complementary SKOS concept scheme represents Gilbert Durand's structures of the imaginary. The resulting framework integrates formal knowledge representation with a layer dedicated to symbolic and cultural interpretation.

To organize the symbolic meanings that creatures carry, the project draws on the work of the French anthropologist **Gilbert Durand**, in particular his book **The Anthropological Structures of the Imaginary** (1960). Durand showed that beneath the endless variety of myths and works of art lie a small number of recurring structures: reservoirs of images and symbols that continue to shape how we think, live, and dream.

The Ontology is structured into three modules:

- The **Provenance Module** documents the historical and textual footprint of every creature in the ontology. It distinguishes between the universal, abstract concept of a beast (Creature) and its source-specific manifestations (Interpretation), allowing the ontology to track how a single entity is described, depicted, or reinterpreted across different authors, periods, and media. It anchors each Interpretation to the primary Source in which it appears and classifies Sources by their genre and intertextual relationships.

- The **Biological Module** catalogs the physical and behavioural traits of creatures — whether real or imaginary — as described in Bestiaries and other Sources. Across all creatures the module captures habitats — distinguishing real geographic environments from mythological or imaginary spaces — diets, and abilities. This layer serves as the primary morphological record that the Symbolic Module then interprets as archetypal and cultural meaning.

- The **Symbolic Module** represents the analytical and interpretive layer of the ontology. It provides two interlocking frameworks for the symbolic analysis of creatures and their source-specific Interpretations. First, the **DurandImaginary scheme** applies Gilbert Durand's anthropological structures of the imaginary to classify creatures according to the Regime (Diurnal or Nocturnal) and structural logic (Schizomorphic, Mystical, or Synthetic) that governs their symbolic imagery. Second, the archetype and narrative function layer — through :Archetype, :NarrativeFunction, :embodiesArchetype, and :hasNarrativeFunction — distinguishes between the universal psychological pattern a creature instantiates across all its manifestations and the specific contextual role it performs within a given Source.

Together, these modules allow the ontology to trace a creature from its historical attestation in a primary text, through its biological description, to its deepest symbolic resonance in the collective imagination.

# Team Members:
- [Maria Juliana Gamboa Nivia](https://github.com/MariaJGamboa)
- [Miriana Pinto](https://github.com/mir-pin)
- [Sara Roggiani](https://github.com/sararoggi)
- [Alice Spadavecchia](https://github.com/alispada)