// Wikipedia/Wikimedia Diagram Library
// High-quality, accurate diagrams for common STEM topics

export const WIKIPEDIA_DIAGRAMS = {
    // Biology - Cells
    "mitochondrion": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Animal_mitochondrion_diagram_en.svg/1200px-Animal_mitochondrion_diagram_en.svg.png",
    "animal cell": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Animal_cell_structure_en.svg/1200px-Animal_cell_structure_en.svg.png",
    "plant cell": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Plant_cell_structure_svg.svg/1200px-Plant_cell_structure_svg.svg.png",
    "eukaryotic cell": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Animal_cell_structure_en.svg/1200px-Animal_cell_structure_en.svg.png",
    "prokaryotic cell": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Prokaryote_cell.svg/1200px-Prokaryote_cell.svg.png",

    // Biology - Organelles
    "chloroplast": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Chloroplast_diagram.svg/1200px-Chloroplast_diagram.svg.png",
    "nucleus": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Diagram_human_cell_nucleus.svg/1200px-Diagram_human_cell_nucleus.svg.png",
    "ribosome": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Ribosome_mRNA_translation_en.svg/1200px-Ribosome_mRNA_translation_en.svg.png",

    // Biology - Systems
    "neuron": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Complete_neuron_cell_diagram_en.svg/1200px-Complete_neuron_cell_diagram_en.svg.png",
    "heart": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Diagram_of_the_human_heart_%28cropped%29.svg/1200px-Diagram_of_the_human_heart_%28cropped%29.svg.png",
    "digestive system": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Digestive_system_diagram_en.svg/800px-Digestive_system_diagram_en.svg.png",

    // Biology - Molecules
    "dna": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/DNA_double_helix.svg/800px-DNA_double_helix.svg.png",
    "dna structure": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/DNA_Structure%2BKey%2BLabelled.pn_NoBB.png/1200px-DNA_Structure%2BKey%2BLabelled.pn_NoBB.png",
    "protein synthesis": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Protein_synthesis.svg/1200px-Protein_synthesis.svg.png",

    // Chemistry
    "periodic table": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Colour_18-col_PT_with_labels.svg/1200px-Colour_18-col_PT_with_labels.svg.png",
    "water molecule": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/H2O_2D_labelled.svg/800px-H2O_2D_labelled.svg.png",
    "benzene": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Benzene-2D-full.svg/800px-Benzene-2D-full.svg.png",

    // Physics
    "electromagnetic spectrum": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/EM_Spectrum_Properties_edit.svg/1200px-EM_Spectrum_Properties_edit.svg.png",
    "atom": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg/800px-Stylised_atom_with_three_Bohr_model_orbits_and_stylised_nucleus.svg.png",
    "solar system": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1200px-Planets2013.svg.png",
};

export function getWikipediaDiagram(topic) {
    const normalizedTopic = topic.toLowerCase().trim();
    return WIKIPEDIA_DIAGRAMS[normalizedTopic] || null;
}
