"""
TESO — Chemistry A/L Skill Graph Seed Data
===========================================
50+ skills mapped to the 14 Chemistry A/L units.
Each skill has prerequisite relationships forming a directed acyclic graph.
These are seeded into the `skills` and `skill_prerequisites` tables on startup.
"""

from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# SKILL DEFINITIONS
# Format: id (string key), name, unit, subject, difficulty, estimated_hours,
#         syllabus_weight, lesson_ids, prerequisites (list of skill id keys)
# ---------------------------------------------------------------------------

CHEMISTRY_SKILLS: List[Dict[str, Any]] = [

    # ── UNIT 1: Atomic Structure ─────────────────────────────────────────
    {
        "key": "atomic_basics",
        "name": "Atomic Structure Basics",
        "description": "Sub-atomic particles, atomic number, mass number, isotopes",
        "unit": 1, "subject": "Chemistry", "difficulty": "easy",
        "estimated_hours": 3.0, "syllabus_weight": 2.0,
        "lesson_ids": [1.1, 1.2], "prerequisites": []
    },
    {
        "key": "electronic_config",
        "name": "Electronic Configuration",
        "description": "Orbitals, quantum numbers, electron filling rules",
        "unit": 1, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.0, "syllabus_weight": 2.5,
        "lesson_ids": [1.3, 1.4], "prerequisites": ["atomic_basics"]
    },
    {
        "key": "periodic_trends",
        "name": "Periodic Table Trends",
        "description": "Ionization energy, electron affinity, electronegativity, atomic radius",
        "unit": 1, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 2.0,
        "lesson_ids": [1.5, 1.6, 1.7], "prerequisites": ["electronic_config"]
    },
    {
        "key": "nuclear_reactions",
        "name": "Nuclear Reactions & Radioactivity",
        "description": "Alpha, beta, gamma decay, half-life, fission, fusion",
        "unit": 1, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 2.5,
        "lesson_ids": [1.8, 1.9, 1.10], "prerequisites": ["atomic_basics"]
    },
    {
        "key": "quantum_model",
        "name": "Quantum Mechanical Model",
        "description": "Wave-particle duality, Heisenberg uncertainty, probability clouds",
        "unit": 1, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.0, "syllabus_weight": 2.0,
        "lesson_ids": [1.11, 1.12, 1.13, 1.14], "prerequisites": ["electronic_config"]
    },

    # ── UNIT 2: Chemical Bonding ──────────────────────────────────────────
    {
        "key": "ionic_bonding",
        "name": "Ionic Bonding",
        "description": "Lattice energy, Born-Haber cycle, ionic structures",
        "unit": 2, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 2.5,
        "lesson_ids": [2.1, 2.2], "prerequisites": ["electronic_config", "periodic_trends"]
    },
    {
        "key": "covalent_bonding",
        "name": "Covalent Bonding & VSEPR",
        "description": "Lewis structures, bond polarity, VSEPR geometry, resonance",
        "unit": 2, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.0, "syllabus_weight": 3.0,
        "lesson_ids": [2.3, 2.4, 2.5], "prerequisites": ["electronic_config"]
    },
    {
        "key": "hybridization",
        "name": "Hybridization",
        "description": "sp, sp2, sp3, sp3d, sp3d2 hybridization, sigma/pi bonds",
        "unit": 2, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.5, "syllabus_weight": 3.0,
        "lesson_ids": [2.6, 2.7, 2.8], "prerequisites": ["covalent_bonding"]
    },
    {
        "key": "intermolecular_forces",
        "name": "Intermolecular Forces",
        "description": "Van der Waals, dipole-dipole, hydrogen bonding, effects on properties",
        "unit": 2, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 2.5,
        "lesson_ids": [2.9, 2.10], "prerequisites": ["covalent_bonding"]
    },

    # ── UNIT 3: Stoichiometry ─────────────────────────────────────────────
    {
        "key": "mole_concept",
        "name": "Mole Concept & Avogadro's Number",
        "description": "Moles, molar mass, Avogadro constant, mass-mole conversions",
        "unit": 3, "subject": "Chemistry", "difficulty": "easy",
        "estimated_hours": 2.5, "syllabus_weight": 2.0,
        "lesson_ids": [3.1, 3.2], "prerequisites": []
    },
    {
        "key": "chemical_equations",
        "name": "Balancing Chemical Equations",
        "description": "Balancing, types of reactions, limiting reagent, excess",
        "unit": 3, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.0, "syllabus_weight": 2.5,
        "lesson_ids": [3.3, 3.4], "prerequisites": ["mole_concept"]
    },
    {
        "key": "stoichiometric_calcs",
        "name": "Stoichiometric Calculations",
        "description": "Yield calculations, percentage yield, atom economy",
        "unit": 3, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 2.5,
        "lesson_ids": [3.5, 3.6, 3.7], "prerequisites": ["chemical_equations"]
    },
    {
        "key": "solutions_concentrations",
        "name": "Solutions & Concentrations",
        "description": "Molarity, molality, dilutions, titration calculations",
        "unit": 3, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.0, "syllabus_weight": 2.5,
        "lesson_ids": [3.8, 3.9, 3.10, 3.11, 3.12], "prerequisites": ["stoichiometric_calcs"]
    },

    # ── UNIT 4: Energetics ────────────────────────────────────────────────
    {
        "key": "enthalpy_basics",
        "name": "Enthalpy & Thermochemistry Basics",
        "description": "Enthalpy of reaction, formation, combustion, Hess's Law",
        "unit": 4, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.0, "syllabus_weight": 2.0,
        "lesson_ids": [4.1, 4.2, 4.3], "prerequisites": ["chemical_equations"]
    },
    {
        "key": "bond_energies",
        "name": "Bond Energies & Enthalpy Cycles",
        "description": "Bond dissociation, Born-Haber cycle applications",
        "unit": 4, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.5, "syllabus_weight": 2.5,
        "lesson_ids": [4.4, 4.5, 4.6], "prerequisites": ["enthalpy_basics", "ionic_bonding"]
    },
    {
        "key": "entropy_gibbs",
        "name": "Entropy & Gibbs Free Energy",
        "description": "Entropy changes, ΔG = ΔH - TΔS, spontaneity prediction",
        "unit": 4, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 2.5,
        "lesson_ids": [4.7, 4.8, 4.9, 4.10], "prerequisites": ["enthalpy_basics"]
    },

    # ── UNIT 5: Kinetics ──────────────────────────────────────────────────
    {
        "key": "reaction_rates",
        "name": "Reaction Rates & Collision Theory",
        "description": "Rate of reaction, collision theory, activation energy",
        "unit": 5, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 2.5,
        "lesson_ids": [5.1, 5.2], "prerequisites": ["enthalpy_basics"]
    },
    {
        "key": "rate_laws",
        "name": "Rate Laws & Orders of Reaction",
        "description": "Rate equations, reaction orders, rate constant, half-life",
        "unit": 5, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 3.0,
        "lesson_ids": [5.3, 5.4, 5.5, 5.6], "prerequisites": ["reaction_rates"]
    },
    {
        "key": "catalysis",
        "name": "Catalysis & Reaction Mechanisms",
        "description": "Homogeneous/heterogeneous catalysis, enzyme catalysis, mechanisms",
        "unit": 5, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.5, "syllabus_weight": 2.5,
        "lesson_ids": [5.7, 5.8, 5.9], "prerequisites": ["rate_laws"]
    },

    # ── UNIT 6: Equilibrium ───────────────────────────────────────────────
    {
        "key": "equilibrium_basics",
        "name": "Chemical Equilibrium Basics",
        "description": "Dynamic equilibrium, Kc, Kp expressions, calculations",
        "unit": 6, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.0, "syllabus_weight": 3.5,
        "lesson_ids": [6.1], "prerequisites": ["chemical_equations"]
    },
    {
        "key": "le_chatelier",
        "name": "Le Chatelier's Principle",
        "description": "Effect of concentration, pressure, temperature on equilibrium",
        "unit": 6, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 3.0,
        "lesson_ids": [6.2], "prerequisites": ["equilibrium_basics"]
    },
    {
        "key": "acid_base_equilibrium",
        "name": "Acid-Base Equilibrium",
        "description": "Ka, Kb, pH calculations, buffers, indicators",
        "unit": 6, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 6.0, "syllabus_weight": 4.0,
        "lesson_ids": [6.3, 6.4], "prerequisites": ["le_chatelier", "solutions_concentrations"]
    },

    # ── UNIT 7: Redox ─────────────────────────────────────────────────────
    {
        "key": "redox_basics",
        "name": "Redox Reactions & Oxidation States",
        "description": "Oxidation states, redox balancing, electron transfer",
        "unit": 7, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.0, "syllabus_weight": 2.5,
        "lesson_ids": [7.1, 7.2], "prerequisites": ["ionic_bonding"]
    },
    {
        "key": "electrochemistry",
        "name": "Electrochemistry & Electrode Potentials",
        "description": "Galvanic cells, electrode potentials, EMF, electrolysis",
        "unit": 7, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 3.0,
        "lesson_ids": [7.3], "prerequisites": ["redox_basics", "entropy_gibbs"]
    },

    # ── UNIT 8: Gaseous State ─────────────────────────────────────────────
    {
        "key": "gas_laws",
        "name": "Gas Laws & Ideal Gas Equation",
        "description": "Boyle's, Charles's, Avogadro's laws, PV=nRT, real gases",
        "unit": 8, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.5, "syllabus_weight": 3.5,
        "lesson_ids": [8.1], "prerequisites": ["mole_concept"]
    },

    # ── UNIT 9: Solutions ─────────────────────────────────────────────────
    {
        "key": "colligative_properties",
        "name": "Colligative Properties",
        "description": "Vapour pressure, boiling point elevation, freezing point depression, osmosis",
        "unit": 9, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.0, "syllabus_weight": 3.5,
        "lesson_ids": [9.1, 9.2], "prerequisites": ["solutions_concentrations", "intermolecular_forces"]
    },
    {
        "key": "solubility_equilibrium",
        "name": "Solubility & Ksp",
        "description": "Solubility product, common ion effect, precipitation reactions",
        "unit": 9, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 4.0, "syllabus_weight": 3.0,
        "lesson_ids": [9.3, 9.4], "prerequisites": ["acid_base_equilibrium"]
    },

    # ── UNIT 10: Group Chemistry ──────────────────────────────────────────
    {
        "key": "s_block",
        "name": "s-Block Elements (Groups 1 & 2)",
        "description": "Alkali metals, alkaline earth metals, reactions, compounds",
        "unit": 10, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 3.0, "syllabus_weight": 2.5,
        "lesson_ids": [10.1, 10.2, 10.3], "prerequisites": ["periodic_trends", "redox_basics"]
    },

    # ── UNIT 11: d-Block & Transition Metals ─────────────────────────────
    {
        "key": "d_block_basics",
        "name": "d-Block Elements & Properties",
        "description": "Variable oxidation states, colored compounds, complex ions",
        "unit": 11, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 3.5,
        "lesson_ids": [11.1, 11.2], "prerequisites": ["electronic_config", "redox_basics"]
    },
    {
        "key": "complex_ions",
        "name": "Complex Ions & Coordination Compounds",
        "description": "Ligands, coordination number, isomerism, stability constants",
        "unit": 11, "subject": "Chemistry", "difficulty": "expert",
        "estimated_hours": 5.5, "syllabus_weight": 3.5,
        "lesson_ids": [11.3, 11.4, 11.5], "prerequisites": ["d_block_basics", "ionic_bonding"]
    },

    # ── UNIT 12: Organic Chemistry Introduction ───────────────────────────
    {
        "key": "organic_basics",
        "name": "Organic Chemistry Basics & Nomenclature",
        "description": "IUPAC naming, functional groups, homologous series, isomerism",
        "unit": 12, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.0, "syllabus_weight": 4.0,
        "lesson_ids": [12.1, 12.2], "prerequisites": ["covalent_bonding"]
    },
    {
        "key": "reaction_mechanisms_intro",
        "name": "Introduction to Reaction Mechanisms",
        "description": "SN1, SN2, E1, E2 mechanisms, nucleophiles, electrophiles, free radicals",
        "unit": 12, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 6.0, "syllabus_weight": 4.5,
        "lesson_ids": [12.3, 12.4, 12.5], "prerequisites": ["organic_basics", "hybridization"]
    },
    {
        "key": "stereochemistry",
        "name": "Stereochemistry",
        "description": "Chirality, enantiomers, diastereomers, R/S configuration",
        "unit": 12, "subject": "Chemistry", "difficulty": "expert",
        "estimated_hours": 5.0, "syllabus_weight": 3.5,
        "lesson_ids": [12.6, 12.7, 12.8], "prerequisites": ["reaction_mechanisms_intro"]
    },

    # ── UNIT 13: Organic Chemistry — Functional Groups ────────────────────
    {
        "key": "alkanes_alkenes",
        "name": "Alkanes & Alkenes",
        "description": "Properties, combustion, addition reactions, polymerization",
        "unit": 13, "subject": "Chemistry", "difficulty": "medium",
        "estimated_hours": 4.5, "syllabus_weight": 3.5,
        "lesson_ids": [13.1], "prerequisites": ["organic_basics"]
    },
    {
        "key": "aromatic_chemistry",
        "name": "Aromatic Chemistry",
        "description": "Benzene structure, electrophilic substitution, directing effects",
        "unit": 13, "subject": "Chemistry", "difficulty": "expert",
        "estimated_hours": 7.0, "syllabus_weight": 5.0,
        "lesson_ids": [13.2], "prerequisites": ["reaction_mechanisms_intro", "hybridization"]
    },
    {
        "key": "functional_group_reactions",
        "name": "Alcohols, Aldehydes, Ketones & Carboxylic Acids",
        "description": "Oxidation, reduction, esterification, nucleophilic addition",
        "unit": 13, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 6.5, "syllabus_weight": 4.5,
        "lesson_ids": [13.3], "prerequisites": ["alkanes_alkenes", "redox_basics"]
    },

    # ── UNIT 14: Polymers & Macromolecules ────────────────────────────────
    {
        "key": "addition_polymers",
        "name": "Addition Polymers",
        "description": "Free radical, cationic, anionic polymerization, common polymers",
        "unit": 14, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 3.5,
        "lesson_ids": [14.1], "prerequisites": ["alkanes_alkenes", "reaction_mechanisms_intro"]
    },
    {
        "key": "condensation_polymers",
        "name": "Condensation Polymers",
        "description": "Polyesters, polyamides, nylon, Kevlar, protein structure",
        "unit": 14, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.0, "syllabus_weight": 3.5,
        "lesson_ids": [14.2], "prerequisites": ["functional_group_reactions"]
    },
    {
        "key": "biomolecules",
        "name": "Biomolecules",
        "description": "Amino acids, proteins, carbohydrates, nucleic acids, enzymes",
        "unit": 14, "subject": "Chemistry", "difficulty": "hard",
        "estimated_hours": 5.5, "syllabus_weight": 4.0,
        "lesson_ids": [14.3], "prerequisites": ["condensation_polymers"]
    },
]


def get_skill_by_key(key: str, skill_list: list) -> dict | None:
    """Helper to find a skill dict by its key."""
    return next((s for s in skill_list if s["key"] == key), None)
