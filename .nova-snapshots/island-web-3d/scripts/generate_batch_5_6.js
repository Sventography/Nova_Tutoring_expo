const fs = require("fs");
const path = require("path");
const outDir = path.join("app","constants","flashcards");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

/** Helper to write a pack */
function writePack(slug, topic, cards) {
  const file = path.join(outDir, `${slug}.json`);
  const json = { topic, flashcards: cards.map(([q,a]) => ({ q, a })) };
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  console.log("✅ wrote", file);
}

/** ==== BATCH 5 & 6 (20 topics) ==== */
const packs = [
  // 1) Chemistry: Analytical
  ["chemistry_analytical","Chemistry: Analytical",[
    ["Analytical chemistry focuses on…","Identification and quantification of chemical components."],
    ["Qualitative vs quantitative","What is present vs how much is present."],
    ["Titration determines…","Concentration via known reagent volume to endpoint."],
    ["Primary standard property","High purity, stable, known composition."],
    ["Indicator use","Color change near equivalence point."],
    ["Gravimetric analysis measures…","Mass of a product/precipitate to infer analyte amount."],
    ["Beer–Lambert law (concept)","Absorbance ∝ concentration × path length."],
    ["Blank solution purpose","Corrects instrument baseline/background."],
    ["LOD vs LOQ","Limit of detection vs limit of quantification."],
    ["Calibration curve","Plot of signal vs known concentrations."],
    ["Systematic error","Consistent bias; affects accuracy."],
    ["Random error","Scatter; affects precision."],
    ["Percent recovery meaning","(Measured/true)×100%; method performance."],
    ["Chromatography separates by…","Differential partition between mobile and stationary phases."],
    ["HPLC stands for","High-Performance Liquid Chromatography."],
    ["GC requires analytes to be…","Volatile/thermally stable."],
    ["Retention time indicates…","How long a compound stays in column (ID hint)."],
    ["Internal standard use","Compensates injection/instrument variability."],
    ["Spike/recovery test checks…","Matrix effects and method accuracy."],
    ["Replicates improve…","Precision and estimate of uncertainty."]
  ]],

  // 2) Biology: Microbiology
  ["biology_microbiology","Biology: Microbiology",[
    ["Microbiology studies…","Microscopic organisms: bacteria, archaea, some fungi, protists, viruses."],
    ["Prokaryote vs eukaryote","No nucleus vs nucleus and organelles."],
    ["Gram-positive vs Gram-negative","Thick peptidoglycan vs thin + outer membrane."],
    ["Antibiotics target…","Bacterial processes (walls, proteins, DNA), not viruses."],
    ["Aseptic technique goal","Prevent contamination."],
    ["Binary fission","Asexual bacterial reproduction."],
    ["Biofilm","Community of microbes on surfaces in matrix."],
    ["Facultative anaerobe","Grows with or without oxygen."],
    ["Obligate anaerobe","Killed by oxygen."],
    ["Virus basic structure","Genetic material + capsid (± envelope)."],
    ["Bacteriophage","Virus that infects bacteria."],
    ["Culture media types","Selective, differential, enriched."],
    ["Koch’s postulates","Link specific microbe to a disease."],
    ["ELISA detects…","Antigen/antibody by enzyme-linked assay."],
    ["PCR purpose","Amplify DNA sequences."],
    ["Sterilization vs disinfection","Destroy all forms vs reduce pathogenic microbes."],
    ["Normal flora role","Beneficial microbes on/in body."],
    ["Antimicrobial resistance cause","Selective pressure; misuse/overuse antibiotics."],
    ["Endospore","Dormant, resistant bacterial form (e.g., Bacillus, Clostridium)."],
    ["Zoonosis","Disease transmitted from animals to humans."]
  ]],

  // 3) Physics: Modern (Relativity & Quantum, intro)
  ["physics_modern","Physics: Modern (Relativity & Quantum, Intro)",[
    ["Special relativity postulate","Physics laws same in inertial frames; c constant."],
    ["Time dilation","Moving clocks run slower (γ factor)."],
    ["Length contraction","Moving objects measured shorter along motion."],
    ["E=mc^2 means","Mass–energy equivalence."],
    ["General relativity core","Gravity as spacetime curvature."],
    ["Photoelectric effect","Light ejects electrons; evidence of photons."],
    ["Wave–particle duality","Particles exhibit wave-like behavior."],
    ["Uncertainty principle","Limits on simultaneous Δx and Δp (Heisenberg)."],
    ["Quantum state","Wavefunction describing probabilities."],
    ["Energy quantization","Discrete energy levels in atoms."],
    ["Bohr model feature","Quantized orbits for electrons (historical)."],
    ["Pauli exclusion principle","No two electrons share same quantum state in atom."],
    ["Spin","Intrinsic angular momentum of particles."],
    ["Superposition","System in combination of states until measurement."],
    ["Entanglement","Correlated quantum states across distance."],
    ["Tunneling","Particles pass barriers via wavefunction probability."],
    ["Photon","Quantum of electromagnetic radiation."],
    ["Compton scattering shows…","Photon momentum; particle behavior of light."],
    ["de Broglie wavelength","λ = h/p, matter waves."],
    ["Schrödinger equation role","Governs wavefunction evolution."]
  ]],

  // 4) Thermodynamics (Physics/Chem)
  ["thermodynamics","Thermodynamics",[
    ["System vs surroundings","Portion studied vs everything else."],
    ["State functions","Depend only on state: U, H, S, G."],
    ["First law","ΔU = q + w (energy conserved)."],
    ["Second law","Entropy of isolated system increases."],
    ["Third law","S → 0 as T → 0 K for perfect crystal."],
    ["Enthalpy H","H = U + pV; heat at constant pressure."],
    ["Gibbs free energy","G = H − TS; spontaneity at const T,p."],
    ["ΔG < 0 implies…","Spontaneous (at given T,p)."],
    ["Exothermic vs endothermic","Release vs absorb heat."],
    ["Isothermal process","Constant temperature."],
    ["Adiabatic process","No heat exchange (q=0)."],
    ["Isochoric process","Constant volume (w=0)."],
    ["Isobaric process","Constant pressure."],
    ["Heat capacity","Energy to raise temperature."],
    ["Carnot efficiency","Max efficiency depends only on T_hot, T_cold."],
    ["Entropy concept","Measure of disorder or microstates."],
    ["Chemical potential","Partial molar Gibbs free energy."],
    ["Phase diagram lines","Phase equilibria (e.g., triple point)."],
    ["Clausius statement","Heat flows hot→cold spontaneously."],
    ["Reversible vs irreversible","Idealized infinitesimal vs real finite processes."]
  ]],

  // 5) Computer Science Basics
  ["cs_basics","Computer Science Basics",[
    ["Algorithm","Step-by-step procedure to solve a problem."],
    ["Data structure","Way to store/organize data (array, list, tree)."],
    ["Time complexity Big-O","Growth rate vs input size (O(n), O(log n), etc.)."],
    ["Binary representation","Base-2 digits 0/1 encode data."],
    ["Compilation vs interpretation","Translate to machine code vs execute line-by-line."],
    ["Variable & type","Named storage; data classification."],
    ["Control flow","Sequence, selection, iteration (if/for/while)."],
    ["Function","Reusable block with inputs/outputs."],
    ["Recursion","Function calls itself on smaller subproblems."],
    ["Stack vs heap (concept)","Call frames vs dynamic memory."],
    ["Pointer/reference","Address to memory location."],
    ["Array vs linked list","Contiguous block vs nodes with pointers."],
    ["Hash table idea","Key→value via hash function."],
    ["Tree & binary tree","Hierarchical structure; ≤2 children per node."],
    ["Graph","Nodes (vertices) connected by edges."],
    ["Sorting example","Quick/merge/heap sort."],
    ["Searching example","Linear vs binary search."],
    ["Concurrency","Multiple tasks progress overlapped."],
    ["Operating system role","Manages hardware/resources/processes."],
    ["Network basics","IP, TCP/UDP, HTTP for communication."]
  ]],

  // 6) Python (Intro)
  ["python_intro","Python (Intro)",[
    ["Print in Python","print('Hello')"],
    ["Variables are…","Dynamically typed names bound to objects."],
    ["List literal","[1,2,3]"],
    ["Dictionary literal","{'a':1,'b':2}"],
    ["For-loop syntax","for x in iterable: …"],
    ["If/elif/else","Conditional branching."],
    ["Function def","def foo(x): return x+1"],
    ["List comprehension","[x*x for x in range(5)]"],
    ["Import module","import math"],
    ["Virtual environment","Isolated deps via venv."],
    ["pip installs…","Packages from PyPI."],
    ["f-string","f\"value={x}\""],
    ["Exceptions","try/except/finally"],
    ["With context","with open('f') as f: …"],
    ["Class","class Dog: def __init__(self,name): …"],
    ["None","Represents absence of value."],
    ["Boolean truthiness","Empty/0/None → Falsey; others True."],
    ["Slicing","s[1:4]"],
    ["PEP8","Python style guide."],
    ["venv activate","source venv/bin/activate (Unix)"]
  ]],

  // 7) JavaScript (Intro)
  ["javascript_intro","JavaScript (Intro)",[
    ["Declare variables","let, const (prefer), var (legacy)."],
    ["Arrow function","const f = (x)=>x+1"],
    ["Strict equality","=== compares value & type."],
    ["Array methods","map/filter/reduce/some/every."],
    ["Object literal","{ key: 'value' }"],
    ["Destructuring","const {a} = obj; const [x,y]=arr;"],
    ["Spread operator","{...obj}, [...arr]"],
    ["Promises","Async results with then/catch."],
    ["async/await","Syntactic sugar for promises."],
    ["DOM access","document.querySelector('#id')"],
    ["Event listener","el.addEventListener('click', fn)"],
    ["JSON parse/stringify","JSON.parse / JSON.stringify"],
    ["Modules (ESM)","export/import keywords."],
    ["Fetch API","fetch(url).then(r=>r.json())"],
    ["Hoisting (concept)","Declarations moved up (var/functions)."],
    ["Truthy/falsey","'',0,null,undefined,false,NaN are falsey."],
    ["Template literals","`Hello ${name}`"],
    ["Set/Map","Collections with unique keys/values."],
    ["LocalStorage","Key-value storage in browser."],
    ["CORS (concept)","Cross-origin request restrictions."]
  ]],

  // 8) HTML/CSS (Intro)
  ["html_css_intro","HTML/CSS (Intro)",[
    ["HTML purpose","Structure web content."],
    ["CSS purpose","Style/presentation for HTML."],
    ["Semantic tags","<header>, <main>, <article>, <footer>."],
    ["Link tag","<a href='…'>"],
    ["Image tag","<img src='…' alt='…'>"],
    ["List tags","<ul>, <ol>, <li>"],
    ["Form basics","<form>, <input>, <label>, <button>"],
    ["CSS selector","div p, .class, #id"],
    ["Box model","content + padding + border + margin"],
    ["Flexbox","1D layout system (justify/align)"],
    ["Grid","2D layout system (rows/cols)"],
    ["Responsive design","Media queries & flexible units."],
    ["Units","px, em, rem, %, vw, vh"],
    ["Positioning","static, relative, absolute, fixed"],
    ["Display","block, inline, inline-block, flex, grid"],
    ["Specificity","Inline > id > class > element"],
    ["Pseudo-classes"," :hover, :focus, :active"],
    ["Variables (CSS)","--var: value; var(--var)"],
    ["Accessibility alt","Use meaningful alt text."],
    ["Viewport meta","<meta name='viewport' content='width=device-width, initial-scale=1'>"]
  ]],

  // 9) Internet Safety
  ["internet_safety","Internet Safety",[
    ["Strong password tip","Use long passphrases; avoid reuse."],
    ["2FA/MFA","Adds a second verification factor."],
    ["Phishing signs","Urgency, suspicious links, typos, unknown sender."],
    ["HTTPS importance","Encrypted connection; look for lock icon."],
    ["Public Wi-Fi risk","Avoid sensitive logins; use VPN."],
    ["Software updates","Patch security vulnerabilities."],
    ["Backups","Protect against ransomware/hardware failure."],
    ["Permissions hygiene","Limit app/site permissions."],
    ["Privacy settings","Review social media sharing defaults."],
    ["Password managers","Generate/store unique passwords."],
    ["Malware types","Virus, worm, trojan, spyware, ransomware."],
    ["Firewall role","Monitors/controls network traffic."],
    ["Secure downloads","Use official sources/check hashes."],
    ["Social engineering","Manipulation to get secrets/access."],
    ["Device encryption","Protects data if device lost."],
    ["Shoulder surfing","Guard screens in public."],
    ["Ad/tracker blockers","Reduce tracking & risky scripts."],
    ["Link preview","Hover/check domain before clicking."],
    ["Data minimization","Share only what’s needed."],
    ["Report abuse","Use platform tools / authorities when needed."]
  ]],

  // 10) World Geography
  ["world_geography","World Geography",[
    ["Five themes of geography","Location, place, region, movement, human–environment."],
    ["Latitude vs longitude","Horizontal parallels vs vertical meridians."],
    ["Equator latitude","0°"],
    ["Prime Meridian longitude","0° (Greenwich)."],
    ["Hemispheres","Northern/Southern; Eastern/Western."],
    ["Continents","Africa, Antarctica, Asia, Europe, North America, Oceania, South America."],
    ["Largest ocean","Pacific Ocean."],
    ["Delta landform","Sediment deposition at river mouth."],
    ["Rain shadow","Dry area downwind of mountains."],
    ["Monsoon","Seasonal wind/rain cycle in S/SE Asia."],
    ["Desert climate","Low precipitation (<25 cm/yr)."],
    ["Tundra","Cold, low vegetation, permafrost."],
    ["Population density","People per unit area."],
    ["Rural vs urban","Countryside/low density vs city/high density."],
    ["GDP per capita","Economic output per person."],
    ["Cultural diffusion","Spread of ideas/culture across regions."],
    ["Globalization impact","Interconnected trade/culture/tech."],
    ["Cartography","Map making."],
    ["GIS","Geographic Information Systems."],
    ["Sustainable development","Meet needs now without harming future."]
  ]],

  // 11) Sociology
  ["sociology","Sociology",[
    ["Sociology studies…","Society, social relationships, institutions."],
    ["Functionalism view","Society as interdependent parts with functions."],
    ["Conflict theory","Power/inequality shape society."],
    ["Symbolic interactionism","Meaning built through interactions."],
    ["Socialization","Learning norms, values, roles."],
    ["Deviance","Behavior violating norms."],
    ["Anomie","Normlessness/weak social regulation."],
    ["Status vs role","Position vs expected behavior."],
    ["Primary vs secondary group","Close/personal vs larger/impersonal."],
    ["Culture","Beliefs, practices, symbols, artifacts."],
    ["Subculture","Distinct group within a culture."],
    ["Social stratification","Hierarchical ranking (class, status, power)."],
    ["Mobility","Movement between social strata."],
    ["Race/ethnicity (sociology)","Socially constructed categories of identity."],
    ["Gender (sociology)","Social roles/expectations tied to sex."],
    ["Institutions","Family, education, religion, economy, state."],
    ["Bureaucracy traits","Hierarchy, rules, division of labor, merit."],
    ["Urbanization","Population shift to cities."],
    ["Demography","Study of populations."],
    ["Social capital","Resources via networks/relationships."]
  ]],

  // 12) Psychology
  ["psychology","Psychology",[
    ["Psychology studies…","Mind and behavior."],
    ["Classical conditioning","Learning via association (Pavlov)."],
    ["Operant conditioning","Learning via reinforcement/punishment (Skinner)."],
    ["Working memory","Short-term processing system."],
    ["Long-term memory types","Explicit (episodic/semantic) vs implicit."],
    ["Big Five traits","OCEAN: openness, conscientiousness, extraversion, agreeableness, neuroticism."],
    ["Cognitive biases","Systematic thinking errors (e.g., confirmation bias)."],
    ["Attachment styles","Secure, anxious, avoidant, disorganized."],
    ["Piaget stages","Sensorimotor, preoperational, concrete, formal."],
    ["Erikson stages (idea)","Psychosocial crises across lifespan."],
    ["Maslow pyramid","Hierarchy of needs."],
    ["Stress response","Sympathetic activation; cortisol."],
    ["Psychotherapy example","CBT: thought–behavior patterns."],
    ["DSM (concept)","Diagnostic manual for mental disorders."],
    ["Placebo effect","Improvement from expectation."],
    ["Motivation theories","Drive, incentive, self-determination."],
    ["Perception vs sensation","Interpretation vs raw input."],
    ["Neurotransmitters","Chemical messengers (e.g., dopamine, serotonin)."],
    ["Reliability vs validity","Consistency vs accuracy of measures."],
    ["Ethics in research","Informed consent, minimize harm, debrief."]
  ]],

  // 13) Philosophy
  ["philosophy","Philosophy",[
    ["Branches","Metaphysics, epistemology, ethics, logic, aesthetics."],
    ["Socratic method","Questioning to probe assumptions."],
    ["Utilitarianism","Maximize overall happiness (consequences)."],
    ["Deontology","Duty- and rule-based ethics."],
    ["Virtue ethics","Character and virtues central."],
    ["Rationalism vs empiricism","Reason vs experience as knowledge sources."],
    ["Skepticism","Question possibility/extent of knowledge."],
    ["Deductive vs inductive","Necessarily true conclusion vs probabilistic."],
    ["Fallacy example","Ad hominem, straw man, false dilemma."],
    ["Free will vs determinism","Choice vs causally fixed outcomes."],
    ["Mind–body problem","Relation between consciousness and brain."],
    ["Social contract","Authority justified by consent (Hobbes/Locke/Rousseau)."],
    ["Existentialism","Meaning, freedom, responsibility (Sartre, Camus)."],
    ["Phenomenology","Study of lived experience (Husserl/Heidegger)."],
    ["Pragmatism","Truth via practical consequences (Peirce/James/Dewey)."],
    ["Relativism","Standards depend on context/culture."],
    ["Realism vs idealism","World independent vs mind-dependent."],
    ["Logic: validity","Form where true premises guarantee true conclusion."],
    ["Occam’s razor","Prefer simpler adequate explanations."],
    ["Eudaimonia","Flourishing; Aristotle’s highest good."]
  ]],

  // 14) Art History
  ["art_history","Art History",[
    ["Prehistoric art example","Cave paintings (Lascaux)."],
    ["Classical Greek traits","Idealized forms, proportion, contrapposto."],
    ["Roman innovations","Arches, concrete, domes."],
    ["Byzantine style","Mosaics, icons, gold backgrounds."],
    ["Gothic features","Pointed arches, rib vaults, stained glass."],
    ["Renaissance focus","Humanism, linear perspective, realism."],
    ["Baroque","Dramatic light, movement, emotion."],
    ["Rococo","Ornate, playful, pastel colors."],
    ["Neoclassicism","Return to classical simplicity/order."],
    ["Romanticism","Emotion, nature, sublime."],
    ["Impressionism","Light/moment, visible brushstrokes."],
    ["Post-Impressionism","Structure/color experiments (Van Gogh, Cézanne)."],
    ["Cubism","Geometric fragmentation (Picasso, Braque)."],
    ["Surrealism","Dream imagery, automatism."],
    ["Abstract Expressionism","Gestural/Color Field (Pollock, Rothko)."],
    ["Pop Art","Mass culture imagery (Warhol)."],
    ["Minimalism","Reduction to essentials."],
    ["Conceptual art","Idea over object."],
    ["Contemporary trends","Globalization, new media."],
    ["Non-Western traditions","African, Asian, Indigenous arts significant."]
  ]],

  // 15) Music Theory
  ["music_theory","Music Theory",[
    ["Pitch vs rhythm","Frequency vs timing pattern."],
    ["Scale","Ordered set of pitches."],
    ["Major vs minor","Different interval patterns/tonal colors."],
    ["Interval","Distance between two notes."],
    ["Chord","Three or more notes together."],
    ["Triad types","Major, minor, diminished, augmented."],
    ["Key signature","Sharps/flats defining key."],
    ["Time signature","Beats per measure & beat unit."],
    ["Tempo","Speed (BPM)."],
    ["Dynamics","Loudness (p, mf, f, etc.)."],
    ["Harmony vs melody","Vertical (chords) vs horizontal (tune)."],
    ["Cadence","Harmonic ending formula (e.g., V–I)."],
    ["Circle of fifths","Key relationships diagram."],
    ["Modes","Ionian, Dorian, Phrygian, etc."],
    ["Counterpoint","Independent melodic lines together."],
    ["Form","Overall structure (ABA, sonata, etc.)."],
    ["Notation","Staff, clefs, notes, rests, accidentals."],
    ["Timbre","Tone color/quality."],
    ["Transposition","Shift music to different key."],
    ["Ear training","Develop recognition of intervals/rhythms/chords."]
  ]],

  // 16) Visual Arts
  ["visual_arts","Visual Arts",[
    ["Elements","Line, shape, form, color, value, texture, space."],
    ["Principles","Balance, contrast, emphasis, movement, pattern, rhythm, unity."],
    ["Perspective","Linear/atmospheric depth cues."],
    ["Color wheel basics","Primary, secondary, tertiary colors."],
    ["Warm vs cool colors","Psychological and spatial effects."],
    ["Complementary colors","Opposites on color wheel; strong contrast."],
    ["Mediums","Oil, acrylic, watercolor, ink, digital, mixed media."],
    ["Drawing techniques","Hatching, cross-hatching, stippling."],
    ["Composition rule","Rule of thirds."],
    ["Figure drawing focus","Proportion, gesture, anatomy."],
    ["Texture rendering","Implied vs actual texture."],
    ["Value scale","Range from light to dark."],
    ["Negative space","Space around/between subjects."],
    ["Contour drawing","Outline of subject form."],
    ["Still life goal","Observation of light/form/materials."],
    ["Portrait basics","Landmarks, planes, lighting."],
    ["Landscape","Depth, horizon, atmospheric perspective."],
    ["Printmaking","Relief, intaglio, lithography, screenprint."],
    ["Critique method","Describe, analyze, interpret, evaluate."],
    ["Portfolio","Curated body of work for review."]
  ]],

  // 17) Theater
  ["theater","Theater",[
    ["Drama elements","Plot, character, theme, dialogue, spectacle."],
    ["Genres","Tragedy, comedy, tragicomedy, farce, melodrama."],
    ["Aristotle’s unities","Time, place, action (classical ideal)."],
    ["Blocking","Planned actor movements on stage."],
    ["Stage areas","Upstage/downstage, stage left/right."],
    ["Fourth wall","Imaginary barrier between actors/audience."],
    ["Monologue vs soliloquy","Speech to others vs to oneself/audience."],
    ["Improvisation","Unscripted performance."],
    ["Method acting","Drawing on personal experience/emotion."],
    ["Costume design","Supports character/time/place."],
    ["Set design","Physical environment of play."],
    ["Lighting design","Visibility, mood, focus."],
    ["Sound design","Music/effects for atmosphere."],
    ["Director role","Unifies vision; guides actors/design."],
    ["Producer role","Finances and logistics."],
    ["Stage manager","Coordinates rehearsals/performance cues."],
    ["Script analysis","Beat breakdown, objectives, actions."],
    ["Auditions & casting","Selecting actors for roles."],
    ["Cue","Signal to begin action/line/tech."],
    ["Curtain call","Actors return for bows."]
  ]],

  // 18) Film Studies
  ["film_studies","Film Studies",[
    ["Mise-en-scène","Everything placed before the camera."],
    ["Cinematography","Camera work, lenses, framing, movement."],
    ["Editing","Shot selection and arrangement."],
    ["Continuity editing","Invisible cuts maintain spatial/temporal flow."],
    ["Montage","Juxtaposition creates meaning/time compression."],
    ["Shot types","WS, MS, CU, ECU; POV; over-the-shoulder."],
    ["Angles","High/low/eye-level; Dutch tilt."],
    ["Lighting styles","High key vs low key; chiaroscuro."],
    ["Sound","Diegetic vs non-diegetic; score; Foley."],
    ["Genre","Horror, sci-fi, drama, comedy, etc."],
    ["Auteur theory","Director as primary creative voice."],
    ["Narrative structure","Three-act, non-linear, ensemble."],
    ["Color grading","Adjust hues/contrast for mood."],
    ["Aspect ratio","Frame dimensions (e.g., 1.85:1, 2.39:1)."],
    ["Deep focus","Large depth of field; multiple planes sharp."],
    ["Long take","Extended shot without cutting."],
    ["Documentary modes","Observational, participatory, reflexive, etc."],
    ["Neorealism","On-location, non-actors, everyday stories."],
    ["New Wave","Innovative editing/handheld; breaking rules."],
    ["Transnational cinema","Global influences, cross-culture production."]
  ]],

  // 19) German (Intermediate)
  ["german_intermediate","German (Intermediate)",[
    ["Perfekt vs Präteritum","Conversational past vs narrative past."],
    ["Sein vs haben (Perfekt)","Movement/state change vs other verbs."],
    ["Zu + infinitive","um/ohne/anstatt … zu + Verb."],
    ["Subjunctive II (Konjunktiv II)","Hypotheticals (ich würde gehen / ich ginge)."],
    ["Word order (Nebensatz)","Verb-final in subordinate clauses."],
    ["Prepositions with cases","für (Akk), mit (Dat), in (Akk/Dat), etc."],
    ["Modal verbs","dürfen, können, mögen, müssen, sollen, wollen."],
    ["Reflexive pronouns","mich, dich, sich, uns, euch, sich."],
    ["Relative pronouns","der/die/das; dem/den/deren, etc."],
    ["Comparatives","-er, am -sten; besser, mehr, weniger."],
    ["Passive voice","werden + Partizip II."],
    ["Future (Futur I)","werden + infinitive."],
    ["Konjunktiv I","Reported speech forms."],
    ["Separable prefixes","ab-, an-, auf-, aus-, ein-, mit-, vor-, zu-."],
    ["Time expressions","seit, bis, während, vor, nach."],
    ["Negation","nicht vs kein(e)."],
    ["Genitive","Possession/relationships (des, der)."],
    ["Common irregulars","sein, haben, werden, gehen, kommen, sehen, geben."],
    ["Da- compounds","damit, darüber, daran…"],
    ["Wo- compounds","womit, worüber, woran…"]
  ]],

  // 20) Japanese (Intermediate)
  ["japanese_intermediate","Japanese (Intermediate)",[
    ["Polite vs plain forms","です/ます vs dictionary forms."],
    ["Te-form uses","Connecting, requests, progressive (~ている)."],
    ["Past tense (た-form)","食べた、行った、見た…"],
    ["Negative forms","ない／ません patterns."],
    ["Particles は vs が","Topic vs subject emphasis."],
    ["Particle を","Marks direct object."],
    ["Particles に/へ","Direction/time/indirect object."],
    ["Particle で","Place of action/instrument."],
    ["Potential form","～られる / ～える (ability)."],
    ["Causative","～させる (make/let)."],
    ["Passive","～られる (be V-ed)."],
    ["Volitional","～よう (let’s / I shall)."],
    ["Conditional","～たら / ～なら / ～と"],
    ["Relative clauses","Noun-modifying verb phrases before noun."],
    ["Counters","本, 枚, 人, 冊, 匹, 台, 個, etc."],
    ["Keigo basics","Polite/honorific/humble speech patterns."],
    ["Conjunctions","でも、しかし、だから、それで、そして。"],
    ["Common onomatopoeia","わくわく、どきどき、ぴかぴか。"],
    ["Kanji practice","Daily reading/writing improves retention."],
    ["Idioms","一石二鳥, 十人十色, 花より団子."]
  ]]
];

for (const [slug, topic, cards] of packs) writePack(slug, topic, cards);
console.log("🎉 Batch 5–6 generation complete.");
