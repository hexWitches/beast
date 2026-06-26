import os
from rdflib import Graph

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ttl_path = os.path.join(base_dir, "ontology", "graph.ttl")
    output_path = os.path.join(base_dir, "website", "assets", "data", "graph.jsonld")

    if not os.path.exists(ttl_path):
        print(f"Error: {ttl_path} not found.")
        return

    g = Graph()
    g.parse(ttl_path, format="turtle")

    context = {
        "beast": "https://w3id.org/beast/ontology#",
        "beastiary": "https://w3id.org/beast/graph/",
        "schema": "https://schema.org/",
        "foaf": "http://xmlns.com/foaf/0.1/",
        "wd": "http://www.wikidata.org/entity/",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "dcterms": "http://purl.org/dc/terms/",
        "owl": "http://www.w3.org/2002/07/owl#",
        "vann": "http://purl.org/vocab/vann/",
        "prov": "http://www.w3.org/ns/prov#",
        "cito": "http://purl.org/spar/cito/"
    }

    g.serialize(destination=output_path, format="json-ld", context=context, indent=2)
    print(f"JSON-LD successfully generated at {output_path}")

if __name__ == "__main__":
    main()