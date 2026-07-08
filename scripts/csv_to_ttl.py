import json
import csv
import os
from rdflib import Graph, URIRef, Literal, Namespace
from rdflib.namespace import RDF, RDFS, XSD, SKOS, DCTERMS, OWL

# Define Namespaces
BEAST = Namespace("https://w3id.org/beast/ontology#")
SCHEMA = Namespace("https://schema.org/")
FOAF = Namespace("http://xmlns.com/foaf/0.1/")
WD = Namespace("http://www.wikidata.org/entity/")
VANN = Namespace("http://purl.org/vocab/vann/")
PROV = Namespace("http://www.w3.org/ns/prov#")
CITO = Namespace("http://purl.org/spar/cito/")
BEASTIARY = Namespace("https://w3id.org/beast/graph/")
VIAF = Namespace("http://viaf.org/viaf/")

NAMESPACES = {
    "beast:": BEAST,
    "beastiary:": BEASTIARY,
    "schema:": SCHEMA,
    "foaf:": FOAF,
    "wd:": WD,
    "rdfs:": RDFS,
    "rdf:": RDF,
    "dcterms:": DCTERMS,
    "skos:": SKOS,
    "xsd:": XSD,
    "owl:": OWL,
    "vann:": VANN,
    "prov:": PROV,
    "cito:": CITO,
    "viaf:": VIAF
}

CONTROLLED_DIETS = {"Omnivorous", "Herbivorous", "Carnivorous", "Scavenger", "Hematophagous", "Lithophagous", "Elemental"}
CONTROLLED_HABITATS = {"Terrestrial", "Aerial", "Aquatic"}

def clean_uri_part(part):
    return part.strip().replace(' ', '_')

def resolve_uri(value, prefix_str):
    clean_val = clean_uri_part(value)
    if not prefix_str:
        return URIRef(clean_val)
    if prefix_str in NAMESPACES:
        return NAMESPACES[prefix_str][clean_val]
    # Handle implicit cases like "schema" instead of "schema:"
    if prefix_str + ":" in NAMESPACES:
        return NAMESPACES[prefix_str + ":"][clean_val]
    return URIRef(prefix_str + clean_val)

def resolve_predicate(predicate_str):
    parts = predicate_str.split(":", 1)
    if len(parts) == 2:
        prefix = parts[0] + ":"
        if prefix in NAMESPACES:
            return NAMESPACES[prefix][parts[1]]
    return URIRef(predicate_str)

def resolve_diet_uri(val):
    clean_val = clean_uri_part(val)
    if clean_val in CONTROLLED_DIETS:
        return BEAST[clean_val]
    return BEASTIARY[clean_val]

def resolve_habitat_uri(val):
    clean_val = clean_uri_part(val)
    if clean_val in CONTROLLED_HABITATS:
        return BEAST[clean_val]
    return BEASTIARY[clean_val]

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    mapping_path = os.path.join(base_dir, "mapping", "csv_to_graph.json")
    data_dir = os.path.join(base_dir, "graph", "data")
    output_path = os.path.join(base_dir, "graph", "graph.ttl")

    # Initialize Graph
    g = Graph()
    g.bind("beast", BEAST)
    g.bind("beastiary", BEASTIARY)
    g.bind("schema", SCHEMA)
    g.bind("foaf", FOAF)
    g.bind("wd", WD)
    g.bind("skos", SKOS)
    g.bind("dcterms", DCTERMS)
    g.bind("owl", OWL)
    g.bind("vann", VANN)
    g.bind("prov", PROV)
    g.bind("cito", CITO)
    g.bind("viaf", VIAF)

    # Load mapping
    with open(mapping_path, 'r', encoding='utf-8') as f:
        mapping = json.load(f)

    for csv_filename, config in mapping.items():
        csv_path = os.path.join(data_dir, csv_filename)
        if not os.path.exists(csv_path):
            print(f"Warning: Data file {csv_path} not found. Skipping.")
            continue

        primary_key_col = config.get("primary_key")
        entity_class = config.get("entity_class")
        properties_map = config.get("properties", {})

        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            # Strip whitespace from column headers to handle accidental spaces
            if reader.fieldnames:
                reader.fieldnames = [h.strip() for h in reader.fieldnames]
            for row_num, row in enumerate(reader):
                subject_id = row.get(primary_key_col)
                if not subject_id:
                    continue
                
                subject_id = clean_uri_part(subject_id)
                subject_uri = BEASTIARY[subject_id]

                # Process entity_class if it's explicitly given
                if entity_class:
                    if ":" in entity_class:
                        g.add((subject_uri, RDF.type, resolve_predicate(entity_class)))
                    elif entity_class in row and row[entity_class]: # Dynamic class from a column
                        class_values = [v.strip() for v in row[entity_class].split(",")]
                        for cv in class_values:
                            if cv:
                                g.add((subject_uri, RDF.type, BEAST[clean_uri_part(cv)]))

                for col_name, prop_config in properties_map.items():
                    if col_name not in row:
                        continue
                    
                    cell_value = row[col_name]
                    if not cell_value:
                        continue

                    # Strip surrounding double quotes if present
                    cell_value = cell_value.strip()
                    if cell_value.startswith('"') and cell_value.endswith('"') and len(cell_value) >= 2:
                        cell_value = cell_value[1:-1]
                        
                    predicate_uri = resolve_predicate(prop_config["predicate"])
                    prop_type = prop_config.get("type", "Literal")

                    if prop_type == "Literal" and prop_config.get("predicate") != "dcterms:language":
                        values = [cell_value.strip()]
                    else:
                        cell_value = cell_value.replace(";", ",")
                        values = [v.strip() for v in cell_value.split(",") if v.strip()]

                    for val in values:
                        if prop_type == "URI":
                            if prop_config["predicate"] in ("beast:hasDiet", "beast:alternativeDiet"):
                                obj_uri = resolve_diet_uri(val)
                            elif prop_config["predicate"] in ("beast:hasHabitat", "beast:alternativeHabitat"):
                                obj_uri = resolve_habitat_uri(val)
                            else:
                                prefix = prop_config.get("prefix", "")
                                obj_uri = resolve_uri(val, prefix)
                            g.add((subject_uri, predicate_uri, obj_uri))
                            
                        elif prop_type == "Literal":
                            lang = prop_config.get("language")
                            datatype_str = prop_config.get("datatype")
                            
                            # Check dynamic language column
                            dynamic_lang_col = prop_config.get("dynamic_language_column")
                            if dynamic_lang_col and dynamic_lang_col in row and row[dynamic_lang_col]:
                                lang = row[dynamic_lang_col].strip()

                            datatype_uri = None
                            if datatype_str:
                                if datatype_str.startswith("xsd:"):
                                    datatype_uri = XSD[datatype_str.split(":", 1)[1]]
                                else:
                                    datatype_uri = URIRef(datatype_str)
                            
                            # Handle multiple languages if comma separated
                            langs = [l.strip() for l in lang.split(",")] if lang else [None]
                            
                            for l in langs:
                                # Avoid applying language to non-string datatypes or when datatype is explicitly provided
                                if datatype_uri and datatype_uri != XSD.string:
                                    lit = Literal(val, datatype=datatype_uri)
                                elif l:
                                    lit = Literal(val, lang=l)
                                elif datatype_uri == XSD.string:
                                    lit = Literal(val, datatype=datatype_uri)
                                else:
                                    lit = Literal(val)
                                    
                                g.add((subject_uri, predicate_uri, lit))
                            
                        elif prop_type == "date":
                            # Special handling for dates if needed
                            datatype_str = prop_config.get("datatype", "xsd:gYear")
                            datatype_uri = XSD[datatype_str.split(":", 1)[1]] if datatype_str.startswith("xsd:") else URIRef(datatype_str)
                            # xsd:gYear requires a 4-digit numeric string; skip non-numeric, zero-pad short years
                            if datatype_uri == XSD.gYear:
                                negative = val.startswith("-")
                                digits = val.lstrip("-")
                                if not digits.isdigit():
                                    print(f"Warning: Skipping invalid gYear value '{val}' (subject: {subject_id})")
                                    continue
                                # Zero-pad to at least 4 digits
                                val = ("-" if negative else "") + digits.zfill(4)
                            g.add((subject_uri, predicate_uri, Literal(val, datatype=datatype_uri)))

    # Durand Scheme
    for subj, obj in g.subject_objects(BEAST.embodiesImaginarySymbol):
        # find the structure for this symbol via skos:broader
        for structure in g.objects(obj, SKOS.broader):
            g.add((subj, BEAST.belongsToImaginaryStructure, structure))
            
            # find the regime for this structure via beast:isGovernedBy
            for regime in g.objects(structure, BEAST.isGovernedBy):
                g.add((subj, BEAST.isGovernedBy, regime))

    g.serialize(destination=output_path, format="turtle")
    print(f"BEASTiary successfully generated at {output_path}")

if __name__ == "__main__":
    main()