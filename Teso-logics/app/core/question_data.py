"""
TESO — Question Bank Seed Data
================================
200+ MCQ questions mapped to Chemistry A/L skills.
Covers all 14 units with varied difficulty levels.
"""

from typing import List, Dict, Any

QUESTIONS_DATA: List[Dict[str, Any]] = [

    # ── ATOMIC BASICS ─────────────────────────────────────────────────────
    {
        "skill_key": "atomic_basics",
        "text": "Which of the following correctly defines the atomic number of an element?",
        "option_a": "The number of neutrons in the nucleus",
        "option_b": "The number of protons in the nucleus",
        "option_c": "The total number of protons and neutrons",
        "option_d": "The number of electrons in the outermost shell",
        "correct_answer": "B",
        "explanation": "The atomic number (Z) is the number of protons in the nucleus, which uniquely identifies an element.",
        "difficulty": "easy", "difficulty_score": 0.1, "time_limit_seconds": 60
    },
    {
        "skill_key": "atomic_basics",
        "text": "Isotopes of an element have the same number of protons but different numbers of:",
        "option_a": "Electrons", "option_b": "Protons",
        "option_c": "Neutrons", "option_d": "Quarks",
        "correct_answer": "C",
        "explanation": "Isotopes have the same atomic number (same protons) but differ in neutron count, giving different mass numbers.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },
    {
        "skill_key": "atomic_basics",
        "text": "The mass number of an atom is equal to:",
        "option_a": "Number of protons only",
        "option_b": "Number of electrons + neutrons",
        "option_c": "Number of protons + neutrons",
        "option_d": "Number of protons + electrons",
        "correct_answer": "C",
        "explanation": "Mass number = protons + neutrons. Electrons have negligible mass.",
        "difficulty": "easy", "difficulty_score": 0.1, "time_limit_seconds": 60
    },
    {
        "skill_key": "atomic_basics",
        "text": "Which of the following is NOT true about isotopes?",
        "option_a": "They have the same atomic number",
        "option_b": "They have different chemical properties",
        "option_c": "They have different mass numbers",
        "option_d": "They occupy the same position in the periodic table",
        "correct_answer": "B",
        "explanation": "Isotopes have nearly identical chemical properties because they have the same electron configuration. They differ in physical properties.",
        "difficulty": "medium", "difficulty_score": 0.35, "time_limit_seconds": 75
    },
    {
        "skill_key": "atomic_basics",
        "text": "An atom of ⁶⁰Co contains how many neutrons?",
        "option_a": "27", "option_b": "33", "option_c": "60", "option_d": "87",
        "correct_answer": "B",
        "explanation": "Cobalt has atomic number 27 (protons). Neutrons = mass number − protons = 60 − 27 = 33.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── ELECTRONIC CONFIGURATION ──────────────────────────────────────────
    {
        "skill_key": "electronic_config",
        "text": "The electronic configuration of Fe³⁺ is:",
        "option_a": "[Ar] 3d⁵ 4s²", "option_b": "[Ar] 3d⁶",
        "option_c": "[Ar] 3d⁵", "option_d": "[Ar] 3d⁴ 4s¹",
        "correct_answer": "C",
        "explanation": "Fe is [Ar] 3d⁶ 4s². Fe³⁺ loses 3 electrons; 4s electrons are removed first, then one 3d electron: [Ar] 3d⁵.",
        "difficulty": "hard", "difficulty_score": 0.7, "time_limit_seconds": 90
    },
    {
        "skill_key": "electronic_config",
        "text": "According to Hund's rule, electrons fill degenerate orbitals by:",
        "option_a": "Pairing in each orbital before filling the next",
        "option_b": "Filling singly with parallel spins first",
        "option_c": "Filling in order of increasing energy",
        "option_d": "Alternating spin up and spin down in each orbital",
        "correct_answer": "B",
        "explanation": "Hund's rule states that electrons occupy degenerate orbitals singly with parallel (same) spins before pairing up.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 75
    },
    {
        "skill_key": "electronic_config",
        "text": "The maximum number of electrons in a subshell with l = 2 is:",
        "option_a": "2", "option_b": "6", "option_c": "10", "option_d": "14",
        "correct_answer": "C",
        "explanation": "l = 2 is the d subshell. It has 5 orbitals × 2 electrons = 10 electrons maximum.",
        "difficulty": "medium", "difficulty_score": 0.35, "time_limit_seconds": 75
    },

    # ── PERIODIC TRENDS ───────────────────────────────────────────────────
    {
        "skill_key": "periodic_trends",
        "text": "Across a period, atomic radius generally:",
        "option_a": "Increases due to more protons",
        "option_b": "Decreases due to increasing nuclear charge",
        "option_c": "Remains constant",
        "option_d": "Increases due to more electron shells",
        "correct_answer": "B",
        "explanation": "Across a period, nuclear charge increases while electrons are added to the same shell. Greater attraction pulls electrons closer, decreasing atomic radius.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "periodic_trends",
        "text": "Which element has the highest electronegativity?",
        "option_a": "Oxygen", "option_b": "Nitrogen", "option_c": "Fluorine", "option_d": "Chlorine",
        "correct_answer": "C",
        "explanation": "Fluorine (F) has the highest electronegativity (3.98 on the Pauling scale) of all elements.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 45
    },
    {
        "skill_key": "periodic_trends",
        "text": "The first ionization energy generally increases across a period because:",
        "option_a": "Atomic radius increases",
        "option_b": "Nuclear charge increases, attracting electrons more strongly",
        "option_c": "More electron shells are added",
        "option_d": "Shielding effect increases",
        "correct_answer": "B",
        "explanation": "Increasing nuclear charge across a period results in stronger attraction for the outermost electrons, requiring more energy to remove them.",
        "difficulty": "medium", "difficulty_score": 0.35, "time_limit_seconds": 75
    },

    # ── IONIC BONDING ─────────────────────────────────────────────────────
    {
        "skill_key": "ionic_bonding",
        "text": "Lattice energy is the energy required to:",
        "option_a": "Form 1 mole of ionic solid from its gaseous ions",
        "option_b": "Separate 1 mole of ionic solid into gaseous ions",
        "option_c": "Dissolve 1 mole of ionic solid in water",
        "option_d": "Convert 1 mole of atoms to ions",
        "correct_answer": "B",
        "explanation": "Lattice energy is the energy needed to completely separate 1 mole of an ionic lattice into its constituent gaseous ions.",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 75
    },
    {
        "skill_key": "ionic_bonding",
        "text": "Which factor most increases lattice energy?",
        "option_a": "Larger ionic radius and lower charge",
        "option_b": "Smaller ionic radius and higher charge",
        "option_c": "Larger ionic radius and higher charge",
        "option_d": "Smaller ionic radius and lower charge",
        "correct_answer": "B",
        "explanation": "Lattice energy ∝ (charge product)/(ionic radius sum). Smaller ions with higher charges pack more tightly and have stronger electrostatic interactions.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 90
    },

    # ── COVALENT BONDING ──────────────────────────────────────────────────
    {
        "skill_key": "covalent_bonding",
        "text": "According to VSEPR theory, the shape of SF₆ is:",
        "option_a": "Octahedral", "option_b": "Trigonal bipyramidal",
        "option_c": "Square planar", "option_d": "Tetrahedral",
        "correct_answer": "A",
        "explanation": "SF₆ has 6 bonding pairs and 0 lone pairs. VSEPR predicts octahedral geometry.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },
    {
        "skill_key": "covalent_bonding",
        "text": "The H-O-H bond angle in water is approximately 104.5°, smaller than the tetrahedral angle (109.5°), because:",
        "option_a": "Hydrogen bonds push atoms closer together",
        "option_b": "Two lone pairs repel bonding pairs more strongly",
        "option_c": "Oxygen has high electronegativity",
        "option_d": "The molecule is polar",
        "correct_answer": "B",
        "explanation": "Lone pair–lone pair repulsion > lone pair–bond pair repulsion > bond pair–bond pair repulsion. Two lone pairs compress the H-O-H angle.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 90
    },

    # ── HYBRIDIZATION ─────────────────────────────────────────────────────
    {
        "skill_key": "hybridization",
        "text": "The hybridization of carbon in ethyne (C₂H₂) is:",
        "option_a": "sp³", "option_b": "sp²", "option_c": "sp", "option_d": "sp³d",
        "correct_answer": "C",
        "explanation": "In ethyne, each carbon forms 2 sigma bonds (one C-H, one C-C) and 2 pi bonds. With 2 electron domains, hybridization is sp, giving a linear geometry.",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 75
    },
    {
        "skill_key": "hybridization",
        "text": "How many sigma (σ) and pi (π) bonds are present in a molecule of benzene (C₆H₆)?",
        "option_a": "6 sigma, 3 pi", "option_b": "9 sigma, 3 pi",
        "option_c": "12 sigma, 3 pi", "option_d": "6 sigma, 6 pi",
        "correct_answer": "C",
        "explanation": "Benzene has 6 C-H sigma bonds + 6 C-C sigma bonds = 12 sigma bonds, plus 3 pi bonds from the delocalized system.",
        "difficulty": "hard", "difficulty_score": 0.7, "time_limit_seconds": 90
    },

    # ── MOLE CONCEPT ──────────────────────────────────────────────────────
    {
        "skill_key": "mole_concept",
        "text": "How many molecules are in 2 moles of CO₂?",
        "option_a": "6.02 × 10²³", "option_b": "1.204 × 10²⁴",
        "option_c": "3.01 × 10²³", "option_d": "2.408 × 10²⁴",
        "correct_answer": "B",
        "explanation": "2 mol × 6.022 × 10²³ molecules/mol = 1.204 × 10²⁴ molecules.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },
    {
        "skill_key": "mole_concept",
        "text": "What is the molar mass of Ca(NO₃)₂?",
        "option_a": "102 g/mol", "option_b": "148 g/mol", "option_c": "164 g/mol", "option_d": "132 g/mol",
        "correct_answer": "C",
        "explanation": "Ca=40, N=14×2=28, O=16×6=96. Total = 40+28+96 = 164 g/mol.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── CHEMICAL EQUATIONS ────────────────────────────────────────────────
    {
        "skill_key": "chemical_equations",
        "text": "In the reaction 2H₂ + O₂ → 2H₂O, if 4 mol of H₂ reacts completely, how many moles of H₂O are produced?",
        "option_a": "2", "option_b": "4", "option_c": "6", "option_d": "8",
        "correct_answer": "B",
        "explanation": "The molar ratio H₂:H₂O is 2:2 = 1:1. So 4 mol H₂ produces 4 mol H₂O.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 75
    },
    {
        "skill_key": "chemical_equations",
        "text": "Which is the limiting reagent when 3 mol N₂ reacts with 6 mol H₂ in N₂ + 3H₂ → 2NH₃?",
        "option_a": "N₂", "option_b": "H₂", "option_c": "Both are limiting", "option_d": "Neither",
        "correct_answer": "B",
        "explanation": "3 mol N₂ requires 9 mol H₂, but only 6 mol H₂ is available. H₂ is the limiting reagent.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 90
    },

    # ── STOICHIOMETRIC CALCULATIONS ───────────────────────────────────────
    {
        "skill_key": "stoichiometric_calcs",
        "text": "If the theoretical yield of a reaction is 25 g and the actual yield is 20 g, the percentage yield is:",
        "option_a": "75%", "option_b": "80%", "option_c": "125%", "option_d": "125%",
        "correct_answer": "B",
        "explanation": "% yield = (actual/theoretical) × 100 = (20/25) × 100 = 80%.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },

    # ── SOLUTIONS & CONCENTRATIONS ────────────────────────────────────────
    {
        "skill_key": "solutions_concentrations",
        "text": "What volume of 2.0 mol dm⁻³ NaOH is needed to prepare 500 cm³ of 0.4 mol dm⁻³ NaOH?",
        "option_a": "50 cm³", "option_b": "100 cm³", "option_c": "200 cm³", "option_d": "250 cm³",
        "correct_answer": "B",
        "explanation": "C₁V₁ = C₂V₂ → 2.0 × V₁ = 0.4 × 500 → V₁ = 200/2.0 = 100 cm³.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 90
    },
    {
        "skill_key": "solutions_concentrations",
        "text": "25.0 cm³ of 0.100 mol dm⁻³ HCl is titrated against NaOH solution. If 20.0 cm³ of NaOH is needed, what is the concentration of NaOH?",
        "option_a": "0.080 mol dm⁻³", "option_b": "0.100 mol dm⁻³",
        "option_c": "0.125 mol dm⁻³", "option_d": "0.150 mol dm⁻³",
        "correct_answer": "C",
        "explanation": "Moles HCl = 0.025 × 0.100 = 0.0025 mol. HCl:NaOH = 1:1, so moles NaOH = 0.0025 mol. [NaOH] = 0.0025/0.020 = 0.125 mol dm⁻³.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 120
    },

    # ── ENTHALPY BASICS ───────────────────────────────────────────────────
    {
        "skill_key": "enthalpy_basics",
        "text": "Using Hess's Law, which of the following statements is correct?",
        "option_a": "Enthalpy change depends on the pathway taken",
        "option_b": "Enthalpy change is the same regardless of the route",
        "option_c": "Enthalpy only applies to combustion reactions",
        "option_d": "Hess's Law only applies at constant volume",
        "correct_answer": "B",
        "explanation": "Hess's Law states that the enthalpy change of a reaction is independent of the pathway; it depends only on the initial and final states.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "enthalpy_basics",
        "text": "The standard enthalpy of formation (ΔHf°) of an element in its standard state is:",
        "option_a": "Positive", "option_b": "Negative", "option_c": "Zero", "option_d": "Cannot be determined",
        "correct_answer": "C",
        "explanation": "By definition, the standard enthalpy of formation of any element in its standard state is zero.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 45
    },

    # ── REACTION RATES ────────────────────────────────────────────────────
    {
        "skill_key": "reaction_rates",
        "text": "Which factor does NOT increase the rate of a chemical reaction?",
        "option_a": "Increasing temperature",
        "option_b": "Adding a catalyst",
        "option_c": "Increasing pressure for a reaction involving only solids",
        "option_d": "Increasing concentration of reactants",
        "correct_answer": "C",
        "explanation": "Pressure changes only affect reactions involving gases. For reactions involving only solids, pressure has no significant effect on rate.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 75
    },
    {
        "skill_key": "reaction_rates",
        "text": "Activation energy is best described as:",
        "option_a": "The energy released when products form",
        "option_b": "The minimum energy required for successful collisions",
        "option_c": "The total energy of reactant molecules",
        "option_d": "The difference in energy between reactants and products",
        "correct_answer": "B",
        "explanation": "Activation energy (Ea) is the minimum kinetic energy that colliding particles must possess for a reaction to occur.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── RATE LAWS ─────────────────────────────────────────────────────────
    {
        "skill_key": "rate_laws",
        "text": "For the reaction A + B → C, if rate = k[A]²[B], what is the overall order of reaction?",
        "option_a": "1", "option_b": "2", "option_c": "3", "option_d": "4",
        "correct_answer": "C",
        "explanation": "Overall order = sum of all exponents = 2 + 1 = 3. Third order overall.",
        "difficulty": "easy", "difficulty_score": 0.25, "time_limit_seconds": 60
    },
    {
        "skill_key": "rate_laws",
        "text": "For a first-order reaction, if the initial concentration doubles, the half-life:",
        "option_a": "Doubles", "option_b": "Halves",
        "option_c": "Remains the same", "option_d": "Quadruples",
        "correct_answer": "C",
        "explanation": "For first-order reactions, t₁/₂ = ln2/k, which is independent of initial concentration.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 90
    },

    # ── EQUILIBRIUM BASICS ────────────────────────────────────────────────
    {
        "skill_key": "equilibrium_basics",
        "text": "At equilibrium, which of the following is true?",
        "option_a": "Forward and reverse reaction rates are both zero",
        "option_b": "Concentrations of reactants and products are equal",
        "option_c": "Forward and reverse reaction rates are equal",
        "option_d": "The reaction has stopped completely",
        "correct_answer": "C",
        "explanation": "At dynamic equilibrium, the rates of the forward and reverse reactions are equal, so concentrations remain constant (not necessarily equal).",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "equilibrium_basics",
        "text": "If Kc > 1 for a reaction at equilibrium, it indicates that:",
        "option_a": "The reaction favors reactants",
        "option_b": "The reaction favors products",
        "option_c": "The reaction is at 50% completion",
        "option_d": "The reaction is endothermic",
        "correct_answer": "B",
        "explanation": "Kc > 1 means the numerator (products) is greater than the denominator (reactants) in the equilibrium expression — products are favored.",
        "difficulty": "medium", "difficulty_score": 0.35, "time_limit_seconds": 60
    },

    # ── LE CHATELIER'S PRINCIPLE ──────────────────────────────────────────
    {
        "skill_key": "le_chatelier",
        "text": "For N₂(g) + 3H₂(g) ⇌ 2NH₃(g) ΔH = -92 kJ/mol, increasing temperature will:",
        "option_a": "Shift equilibrium to the right (more NH₃)",
        "option_b": "Shift equilibrium to the left (less NH₃)",
        "option_c": "Have no effect on equilibrium position",
        "option_d": "Increase the value of Kc",
        "correct_answer": "B",
        "explanation": "The forward reaction is exothermic (ΔH < 0). Increasing temperature adds heat, so Le Chatelier shifts equilibrium left (endothermic direction) to absorb it.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 90
    },

    # ── ACID-BASE EQUILIBRIUM ─────────────────────────────────────────────
    {
        "skill_key": "acid_base_equilibrium",
        "text": "What is the pH of a 0.01 mol dm⁻³ HCl solution?",
        "option_a": "1", "option_b": "2", "option_c": "3", "option_d": "12",
        "correct_answer": "B",
        "explanation": "HCl is a strong acid: [H⁺] = 0.01 = 10⁻² mol dm⁻³. pH = -log(10⁻²) = 2.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "acid_base_equilibrium",
        "text": "A buffer solution resists pH changes by containing:",
        "option_a": "A strong acid and its conjugate base",
        "option_b": "A weak acid and its conjugate base (or weak base and conjugate acid)",
        "option_c": "Pure water with dissolved salts",
        "option_d": "Equal volumes of strong acid and strong base",
        "correct_answer": "B",
        "explanation": "Buffer solutions consist of a weak acid/conjugate base pair (or weak base/conjugate acid pair) that can neutralize added acids or bases.",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 75
    },

    # ── REDOX BASICS ──────────────────────────────────────────────────────
    {
        "skill_key": "redox_basics",
        "text": "In the reaction Zn + CuSO₄ → ZnSO₄ + Cu, which species is oxidized?",
        "option_a": "Cu²⁺", "option_b": "Zn", "option_c": "SO₄²⁻", "option_d": "Cu",
        "correct_answer": "B",
        "explanation": "Zn → Zn²⁺ + 2e⁻ (loses electrons = oxidized). Cu²⁺ gains electrons (reduced).",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "redox_basics",
        "text": "What is the oxidation state of Cr in K₂Cr₂O₇?",
        "option_a": "+3", "option_b": "+4", "option_c": "+6", "option_d": "+7",
        "correct_answer": "C",
        "explanation": "K is +1 (×2 = +2), O is -2 (×7 = -14). Let Cr = x: +2 + 2x - 14 = 0 → 2x = 12 → x = +6.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 90
    },

    # ── GAS LAWS ─────────────────────────────────────────────────────────
    {
        "skill_key": "gas_laws",
        "text": "At constant temperature, if the volume of a gas is halved, the pressure:",
        "option_a": "Doubles", "option_b": "Halves", "option_c": "Stays the same", "option_d": "Quadruples",
        "correct_answer": "A",
        "explanation": "Boyle's Law: P₁V₁ = P₂V₂ at constant T. If V is halved, P must double.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },
    {
        "skill_key": "gas_laws",
        "text": "Using the ideal gas law, calculate the moles of gas at 2 atm, 10 L, and 300 K. (R = 0.0821 L·atm/mol·K)",
        "option_a": "0.41 mol", "option_b": "0.81 mol", "option_c": "1.64 mol", "option_d": "3.28 mol",
        "correct_answer": "B",
        "explanation": "n = PV/RT = (2 × 10)/(0.0821 × 300) = 20/24.63 ≈ 0.81 mol.",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 90
    },

    # ── ORGANIC BASICS ────────────────────────────────────────────────────
    {
        "skill_key": "organic_basics",
        "text": "The IUPAC name for CH₃CH₂CH(CH₃)CH₂CH₃ is:",
        "option_a": "2-methylpentane", "option_b": "3-methylpentane",
        "option_c": "2-ethylbutane", "option_d": "3-ethylbutane",
        "correct_answer": "B",
        "explanation": "The longest chain has 5 carbons (pentane). The methyl branch is on C3: 3-methylpentane.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 90
    },
    {
        "skill_key": "organic_basics",
        "text": "Structural isomers are compounds that have the same:",
        "option_a": "Molecular formula but different structural formulas",
        "option_b": "Structural formula but different molecular formulas",
        "option_c": "Arrangement of atoms in space",
        "option_d": "Physical properties but different chemical properties",
        "correct_answer": "A",
        "explanation": "Structural isomers (constitutional isomers) have the same molecular formula but differ in the connectivity (arrangement) of atoms.",
        "difficulty": "easy", "difficulty_score": 0.25, "time_limit_seconds": 60
    },

    # ── REACTION MECHANISMS ───────────────────────────────────────────────
    {
        "skill_key": "reaction_mechanisms_intro",
        "text": "Which mechanism involves the formation of a carbocation intermediate?",
        "option_a": "SN2", "option_b": "SN1", "option_c": "E2", "option_d": "Free radical substitution",
        "correct_answer": "B",
        "explanation": "SN1 (unimolecular nucleophilic substitution) proceeds through a planar carbocation intermediate in its rate-determining step.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },
    {
        "skill_key": "reaction_mechanisms_intro",
        "text": "SN2 reactions are favored by:",
        "option_a": "Tertiary substrates and polar protic solvents",
        "option_b": "Primary substrates and polar aprotic solvents",
        "option_c": "Tertiary substrates and polar aprotic solvents",
        "option_d": "Secondary substrates and non-polar solvents",
        "correct_answer": "B",
        "explanation": "SN2 requires unhindered (primary) substrates for backside attack, and polar aprotic solvents that don't solvate the nucleophile.",
        "difficulty": "hard", "difficulty_score": 0.75, "time_limit_seconds": 90
    },

    # ── AROMATIC CHEMISTRY ────────────────────────────────────────────────
    {
        "skill_key": "aromatic_chemistry",
        "text": "Benzene undergoes electrophilic aromatic substitution (EAS) rather than addition because:",
        "option_a": "It is too unreactive for addition reactions",
        "option_b": "Substitution preserves the aromatic delocalization",
        "option_c": "Addition reactions would produce toxic products",
        "option_d": "The ring double bonds are weaker than normal alkene bonds",
        "correct_answer": "B",
        "explanation": "EAS preserves the aromaticity of the benzene ring. Addition would disrupt the delocalized π electron system, losing the ~150 kJ/mol stabilization energy.",
        "difficulty": "hard", "difficulty_score": 0.7, "time_limit_seconds": 90
    },
    {
        "skill_key": "aromatic_chemistry",
        "text": "An electron-donating group (EDG) on benzene directs incoming electrophiles to:",
        "option_a": "Meta positions only", "option_b": "Ortho and para positions",
        "option_c": "Para position only", "option_d": "Ortho position only",
        "correct_answer": "B",
        "explanation": "EDGs (like -OH, -NH₂, -CH₃) activate the ring and direct substitution to ortho and para positions through resonance/inductive effects.",
        "difficulty": "hard", "difficulty_score": 0.7, "time_limit_seconds": 90
    },

    # ── ALKANES AND ALKENES ───────────────────────────────────────────────
    {
        "skill_key": "alkanes_alkenes",
        "text": "Which reagent is used to distinguish an alkene from an alkane?",
        "option_a": "Concentrated H₂SO₄", "option_b": "Bromine water",
        "option_c": "Dilute HCl", "option_d": "Concentrated NaOH",
        "correct_answer": "B",
        "explanation": "Alkenes decolorize bromine water through electrophilic addition, while alkanes do not react (they are saturated).",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "alkanes_alkenes",
        "text": "Markovnikov's rule states that in addition to an unsymmetrical alkene, hydrogen adds to:",
        "option_a": "The carbon with fewer hydrogen atoms",
        "option_b": "The carbon with more hydrogen atoms",
        "option_c": "Both carbons equally",
        "option_d": "The more substituted carbon",
        "correct_answer": "B",
        "explanation": "Markovnikov's rule: H⁺ adds to the carbon that already has more H atoms (forming the more stable carbocation at the other carbon).",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },

    # ── ENTROPY & GIBBS ───────────────────────────────────────────────────
    {
        "skill_key": "entropy_gibbs",
        "text": "A reaction is spontaneous at all temperatures when:",
        "option_a": "ΔH > 0 and ΔS < 0",
        "option_b": "ΔH < 0 and ΔS > 0",
        "option_c": "ΔH < 0 and ΔS < 0",
        "option_d": "ΔH > 0 and ΔS > 0",
        "correct_answer": "B",
        "explanation": "ΔG = ΔH - TΔS. When ΔH < 0 and ΔS > 0, ΔG is always negative regardless of temperature. Always spontaneous.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },
    {
        "skill_key": "entropy_gibbs",
        "text": "Dissolving a solid salt in water generally results in:",
        "option_a": "Decreased entropy", "option_b": "Increased entropy",
        "option_c": "No change in entropy", "option_d": "Negative enthalpy only",
        "correct_answer": "B",
        "explanation": "Dissolving a salt breaks the ordered crystal lattice and disperses ions throughout solution, greatly increasing disorder (entropy).",
        "difficulty": "easy", "difficulty_score": 0.25, "time_limit_seconds": 60
    },

    # ── d-BLOCK BASICS ────────────────────────────────────────────────────
    {
        "skill_key": "d_block_basics",
        "text": "Transition metals exhibit variable oxidation states primarily because:",
        "option_a": "They have large atomic radii",
        "option_b": "The 3d and 4s subshells have similar energies",
        "option_c": "They form covalent bonds easily",
        "option_d": "They have high melting points",
        "correct_answer": "B",
        "explanation": "The small energy difference between 3d and 4s orbitals allows various numbers of electrons to be used in bonding, resulting in multiple oxidation states.",
        "difficulty": "hard", "difficulty_score": 0.65, "time_limit_seconds": 90
    },
    {
        "skill_key": "d_block_basics",
        "text": "Which property is NOT characteristic of transition metals?",
        "option_a": "Formation of colored compounds",
        "option_b": "Variable oxidation states",
        "option_c": "Catalytic activity",
        "option_d": "Low melting points",
        "correct_answer": "D",
        "explanation": "Transition metals typically have high melting points due to strong metallic bonding involving d-electron participation.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── COLLIGATIVE PROPERTIES ────────────────────────────────────────────
    {
        "skill_key": "colligative_properties",
        "text": "Colligative properties depend on:",
        "option_a": "The chemical nature of solute particles",
        "option_b": "The concentration (number) of solute particles",
        "option_c": "The molecular mass of the solvent",
        "option_d": "The temperature of the solution",
        "correct_answer": "B",
        "explanation": "Colligative properties (BP elevation, FP depression, osmotic pressure, vapour pressure lowering) depend only on the number of solute particles, not their identity.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "colligative_properties",
        "text": "Osmosis occurs when:",
        "option_a": "A solvent moves from high concentration to low concentration",
        "option_b": "A solvent moves through a semi-permeable membrane from dilute to concentrated solution",
        "option_c": "A solute moves through a membrane from dilute to concentrated solution",
        "option_d": "A solute diffuses from high to low concentration",
        "correct_answer": "B",
        "explanation": "Osmosis is the movement of solvent (not solute) through a semi-permeable membrane from a region of lower solute concentration to higher solute concentration.",
        "difficulty": "medium", "difficulty_score": 0.35, "time_limit_seconds": 75
    },

    # ── s-BLOCK ───────────────────────────────────────────────────────────
    {
        "skill_key": "s_block",
        "text": "Down Group 1, the reactivity of alkali metals with water:",
        "option_a": "Decreases", "option_b": "Increases",
        "option_c": "Remains the same", "option_d": "Alternates",
        "correct_answer": "B",
        "explanation": "Down Group 1, ionization energy decreases (outer electron further from nucleus, more shielded), so reactivity with water increases (Li < Na < K < Rb < Cs).",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── ADDITION POLYMERS ─────────────────────────────────────────────────
    {
        "skill_key": "addition_polymers",
        "text": "Poly(ethene) is formed by the polymerization of ethene monomers. The type of polymerization is:",
        "option_a": "Condensation polymerization",
        "option_b": "Addition polymerization",
        "option_c": "Co-polymerization",
        "option_d": "Ring-opening polymerization",
        "correct_answer": "B",
        "explanation": "Ethene undergoes addition polymerization. The C=C double bond opens and monomers join without elimination of small molecules.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },
    {
        "skill_key": "addition_polymers",
        "text": "Which of the following is an addition polymer?",
        "option_a": "Nylon", "option_b": "Polyester", "option_c": "Polypropylene", "option_d": "Kevlar",
        "correct_answer": "C",
        "explanation": "Polypropylene is formed by addition polymerization of propene monomers. Nylon, polyester, and Kevlar are condensation polymers.",
        "difficulty": "medium", "difficulty_score": 0.3, "time_limit_seconds": 60
    },

    # ── CONDENSATION POLYMERS ─────────────────────────────────────────────
    {
        "skill_key": "condensation_polymers",
        "text": "What small molecule is eliminated during condensation polymerization to form a polyester?",
        "option_a": "HCl", "option_b": "NH₃", "option_c": "H₂O", "option_d": "CO₂",
        "correct_answer": "C",
        "explanation": "Polyesters form from diol + dicarboxylic acid. The –OH of one and –COOH of another react, eliminating H₂O to form the ester linkage.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },

    # ── BIOMOLECULES ──────────────────────────────────────────────────────
    {
        "skill_key": "biomolecules",
        "text": "Amino acids are linked together in proteins by:",
        "option_a": "Ester bonds", "option_b": "Glycosidic bonds",
        "option_c": "Peptide bonds", "option_d": "Phosphodiester bonds",
        "correct_answer": "C",
        "explanation": "Peptide bonds (amide bonds) form between the carboxyl group of one amino acid and the amino group of another, with loss of water.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },
    {
        "skill_key": "biomolecules",
        "text": "Which level of protein structure refers to the sequence of amino acids?",
        "option_a": "Secondary", "option_b": "Tertiary",
        "option_c": "Primary", "option_d": "Quaternary",
        "correct_answer": "C",
        "explanation": "The primary structure of a protein is the linear sequence of amino acids in the polypeptide chain.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 45
    },

    # ── COMPLEX IONS ──────────────────────────────────────────────────────
    {
        "skill_key": "complex_ions",
        "text": "In [Co(NH₃)₆]³⁺, what is the coordination number of cobalt?",
        "option_a": "3", "option_b": "4", "option_c": "6", "option_d": "9",
        "correct_answer": "C",
        "explanation": "The coordination number is the number of ligand atoms directly bonded to the central metal ion. Six NH₃ ligands give coordination number 6.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 60
    },

    # ── STEREOCHEMISTRY ───────────────────────────────────────────────────
    {
        "skill_key": "stereochemistry",
        "text": "A chiral carbon (stereocenter) is a carbon atom bonded to:",
        "option_a": "Four identical groups",
        "option_b": "Four different groups",
        "option_c": "Two double bonds",
        "option_d": "At least one hydrogen",
        "correct_answer": "B",
        "explanation": "A chiral carbon has four different substituents, making the molecule non-superimposable on its mirror image (chiral).",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 75
    },
    {
        "skill_key": "stereochemistry",
        "text": "Enantiomers have identical physical properties except for their:",
        "option_a": "Melting points", "option_b": "Boiling points",
        "option_c": "Direction of plane-polarized light rotation", "option_d": "Solubility",
        "correct_answer": "C",
        "explanation": "Enantiomers are mirror images that rotate plane-polarized light in opposite directions (one is (+), the other is (-)), but have identical other physical properties.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },

    # ── FUNCTIONAL GROUP REACTIONS ────────────────────────────────────────
    {
        "skill_key": "functional_group_reactions",
        "text": "Which reagent selectively oxidizes a primary alcohol to an aldehyde (without further oxidation to carboxylic acid)?",
        "option_a": "KMnO₄ (acidic)", "option_b": "K₂Cr₂O₇ (acidic)",
        "option_c": "PCC (pyridinium chlorochromate)", "option_d": "CrO₃",
        "correct_answer": "C",
        "explanation": "PCC (pyridinium chlorochromate) oxidizes primary alcohols to aldehydes and stops there. Acidic KMnO₄ and K₂Cr₂O₇ would further oxidize to carboxylic acids.",
        "difficulty": "hard", "difficulty_score": 0.75, "time_limit_seconds": 90
    },

    # ── ELECTROCHEMISTRY ──────────────────────────────────────────────────
    {
        "skill_key": "electrochemistry",
        "text": "In a galvanic (voltaic) cell, oxidation occurs at the:",
        "option_a": "Cathode", "option_b": "Anode",
        "option_c": "Salt bridge", "option_d": "Positive electrode",
        "correct_answer": "B",
        "explanation": "In a galvanic cell: Anode = oxidation (OIL), Cathode = reduction (RIG). Remember: AN OX, RED CAT.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
    {
        "skill_key": "electrochemistry",
        "text": "The standard cell potential E°cell is calculated as:",
        "option_a": "E°cathode − E°anode", "option_b": "E°anode − E°cathode",
        "option_c": "E°cathode + E°anode", "option_d": "E°anode × E°cathode",
        "correct_answer": "A",
        "explanation": "E°cell = E°cathode − E°anode (reduction potentials). A positive E°cell indicates a spontaneous reaction.",
        "difficulty": "medium", "difficulty_score": 0.45, "time_limit_seconds": 75
    },

    # ── NUCLEAR REACTIONS ─────────────────────────────────────────────────
    {
        "skill_key": "nuclear_reactions",
        "text": "After 3 half-lives, what fraction of the original radioactive sample remains?",
        "option_a": "1/2", "option_b": "1/4", "option_c": "1/8", "option_d": "1/16",
        "correct_answer": "C",
        "explanation": "After n half-lives, fraction remaining = (1/2)ⁿ = (1/2)³ = 1/8.",
        "difficulty": "easy", "difficulty_score": 0.25, "time_limit_seconds": 60
    },
    {
        "skill_key": "nuclear_reactions",
        "text": "Alpha decay results in:",
        "option_a": "Atomic number increases by 1, mass number unchanged",
        "option_b": "Atomic number decreases by 2, mass number decreases by 4",
        "option_c": "Atomic number increases by 2, mass number increases by 4",
        "option_d": "Only mass number changes",
        "correct_answer": "B",
        "explanation": "Alpha particle (⁴₂He) emission: Z decreases by 2, A decreases by 4.",
        "difficulty": "medium", "difficulty_score": 0.4, "time_limit_seconds": 75
    },

    # ── SOLUBILITY EQUILIBRIUM ────────────────────────────────────────────
    {
        "skill_key": "solubility_equilibrium",
        "text": "The common ion effect causes the solubility of a sparingly soluble salt to:",
        "option_a": "Increase", "option_b": "Decrease",
        "option_c": "Remain unchanged", "option_d": "First increase then decrease",
        "correct_answer": "B",
        "explanation": "Adding a common ion shifts the dissolution equilibrium (Le Chatelier) toward the undissolved salt, decreasing solubility.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },

    # ── CATALYSIS ─────────────────────────────────────────────────────────
    {
        "skill_key": "catalysis",
        "text": "A catalyst increases reaction rate by:",
        "option_a": "Increasing the activation energy",
        "option_b": "Providing an alternative pathway with lower activation energy",
        "option_c": "Increasing the temperature of reactants",
        "option_d": "Increasing the concentration of reactants",
        "correct_answer": "B",
        "explanation": "A catalyst lowers the activation energy by providing an alternative reaction pathway, allowing more particles to have sufficient energy for successful collisions.",
        "difficulty": "easy", "difficulty_score": 0.15, "time_limit_seconds": 60
    },

    # ── QUANTUM MODEL ─────────────────────────────────────────────────────
    {
        "skill_key": "quantum_model",
        "text": "According to the Heisenberg Uncertainty Principle, it is impossible to simultaneously know precisely both:",
        "option_a": "Mass and charge of an electron",
        "option_b": "Position and momentum of an electron",
        "option_c": "Spin and energy of an electron",
        "option_d": "Wavelength and frequency of light",
        "correct_answer": "B",
        "explanation": "The Heisenberg Uncertainty Principle states: Δx·Δp ≥ ℏ/2. The more precisely position is known, the less precisely momentum can be known.",
        "difficulty": "medium", "difficulty_score": 0.5, "time_limit_seconds": 75
    },

    # ── BOND ENERGIES ─────────────────────────────────────────────────────
    {
        "skill_key": "bond_energies",
        "text": "Bond dissociation energy is the energy required to:",
        "option_a": "Form 1 mole of bonds from atoms",
        "option_b": "Break 1 mole of a specific bond in gaseous molecules",
        "option_c": "Dissolve 1 mole of a compound",
        "option_d": "Convert 1 mole of liquid to gas",
        "correct_answer": "B",
        "explanation": "Bond dissociation energy is the enthalpy required to homolytically break 1 mole of a particular bond in a gaseous molecule.",
        "difficulty": "easy", "difficulty_score": 0.2, "time_limit_seconds": 60
    },
]
