const fs = require("fs");
const path = require("path");
const outDir = path.join("app","constants","flashcards");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function writePack(slug, topic, cards) {
  const file = path.join(outDir, `${slug}.json`);
  const json = { topic, flashcards: cards.map(([q,a]) => ({ q, a })) };
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  console.log("✅ wrote", file);
}

const packs = [
  // 1) Italian (Intermediate)
  ["italian_intermediate","Italian (Intermediate)",[
    ["Passato prossimo vs imperfetto","Completed past vs ongoing/background."],
    ["Essere vs avere (ausiliari)","Movement/state change with essere; most others with avere."],
    ["Pronomi diretti","mi, ti, lo/la, ci, vi, li/le."],
    ["Pronomi indiretti","mi, ti, gli/le, ci, vi, gli."],
    ["Ne / Ci usage","ne = of it/them; ci = there/about it/us."],
    ["Futuro semplice (io)","-ò (parlerò, andrò)."],
    ["Condizionale (io)","-ei (parlerei, andrei)."],
    ["Congiuntivo trigger","Doubt/emotion/impersonal (penso che…, è possibile che…)."],
    ["Comparativi","più/meno… di/che; migliore/peggiore."],
    ["Superlativi","il più…; -issimo."],
    ["Imperativo (tu)","parla!/non parlare!; with pronouns attached (dimmi)."],
    ["Reflexive verbs","alzarsi, vestirsi; mi/ti/si/ci/vi/si."],
    ["Verbi modali","potere, dovere, volere + infinito."],
    ["Preposizioni articolate","del, nello, sullo, etc."],
    ["Passato remoto (idea)","Narrative past in literature/history."],
    ["Periodo ipotetico","se + presente → futuro; se + congiuntivo imperf. → condizionale."],
    ["Verbi irregolari","essere, avere, andare, venire, fare, dire, stare."],
    ["Accento & pronuncia","C/g soft before e,i; sc before i/e → /ʃ/."],
    ["Tempo progressivo","stare + gerundio (sto parlando)."],
    ["Espressioni comuni","magari, figurati, boh, dai!"]
  ]],

  // 2) Spanish (Advanced)
  ["spanish_advanced","Spanish (Advanced)",[
    ["Subjuntivo imperfecto","-ra/-se forms (hablara/hablase)."],
    ["Pluscuamperfecto de subj.","hubiera/hubiese + participio."],
    ["Condicional compuesto","habría + participio (habría ido)."],
    ["Si-clauses avanzadas","Si + plusc. subj. → cond. comp. (contrafactual pasado)."],
    ["Pretérito perfecto","he/has/ha + participio."],
    ["Voz pasiva","ser + participio (fue escrito)."],
    ["Perífrasis verbales","seguir + gerundio; acabar de + inf.; volver a + inf."],
    ["Cláusulas relativas","que, quien(es), el/la cual, cuyo."],
    ["Pronombres relativos posesivos","cuyo, cuya, cuyos, cuyas."],
    ["Discurso indirecto","Cambio de tiempos/índices (dijo que…)."],
    ["Se pasivo / se impersonal","Se venden libros / Se habla español."],
    ["Leísmo/loísmo","Variación regional de pronombres de objeto."],
    ["Colocación de pronombres","Antes del verbo o pospuestos al infinitivo/gerundio/imperativo."],
    ["Conectores avanzados","sin embargo, no obstante, por consiguiente."],
    ["Concordancia","Género/número/tiempo adecuados."],
    ["Registro formal vs informal","Usted/Ustedes; tratamientos; vocabulario."],
    ["Falsos cognados","éxito≠exit; embarazada≠embarrassed."],
    ["Subjuntivo con negación/duda","No creo que venga; dudo que sea cierto."],
    ["Ser/Estar con adjetivos","está listo (preparado) vs es listo (inteligente)."],
    ["Colocaciones útiles","tomar una decisión, echar de menos, dar cuenta."]
  ]],

  // 3) German (Advanced)
  ["german_advanced","German (Advanced)",[
    ["Konjunktiv I","Reported speech forms (er sei, er habe)."],
    ["Konjunktiv II Vergangenheit","hätte/wäre + Partizip II (wäre gegangen)."],
    ["Nebensatzkomplexe","weil/obwohl/als/als ob/während/indem … verb-final."],
    ["Präpositionen mit Genitiv","während, trotz, aufgrund, innerhalb, außerhalb."],
    ["Nominalisierung","Verben/Adjektive → Nomen (das Rauchen)."],
    ["Partizipialattribute","das in Berlin gebaute Haus."],
    ["Trennbare/untrennbare Präfixe","ab-/auf-/ein- vs ver-, be-, ent-, zer-."],
    ["Satzklammer","Teile des Verbs umklammern den Satz."],
    ["Passivformen","Vorgangspassiv (werden) vs Zustandspassiv (sein)."],
    ["Wortstellung","TeKaMoLo (Temporal, Kausal, Modal, Lokal)."],
    ["Modalpartikeln","doch, mal, ja, eben, wohl (Nuancen)."],
    ["Relativsätze","der/die/das; welcher (formell)."],
    ["Futur II","werde + Partizip II + haben/sein (Vermutung in Zukunft/Vergangenheit)."],
    ["Konjunktionaladverbien","deshalb, trotzdem, außerdem (Verb Zweit)."],
    ["Amtliche Register","Förmliche Anrede Sie; Behördensprache."],
    ["Skopos im Text","Absicht/Stil an Zielpublikum anpassen."],
    ["Lehnwörter/Anglizismen","der Computer, das Team, downloaden."],
    ["Zusammensetzungen","Haupt+bahn+hof (Komposita)."],
    ["Genus/Pluralbildung","Der/die/das & -e/-er/-en/-s etc."],
    ["Idiomatik","ins Auge gehen, auf dem Schlauch stehen."]
  ]],

  // 4) French (Advanced)
  ["french_advanced","French (Advanced)",[
    ["Subjonctif passé","subjonctif d’avoir/être + participe (qu’il ait fait)."],
    ["Plus-que-parfait","avait/était + participe (avait fini)."],
    ["Conditionnel passé","aurait/serait + participe (aurait pu)."],
    ["Discours indirect","Changements de temps (il a dit qu’il viendrait)."],
    ["Pronoms relatifs composés","lequel, laquelle, auxquels…"],
    ["Participe présent/Gérondif","en + participe présent (en mangeant)."],
    ["Voix passive","être + participe (est écrit par)."],
    ["Subjonctif déclencheurs","bien que, quoique, pour que, avant que."],
    ["Registre soutenu vs familier","Langage formel/informel; tutoiement/vouvoiement."],
    ["Accords du participe passé","Avec être/avec COD précédent (les lettres qu’il a écrites)."],
    ["Négation complexe","ne… guère/plus/jamais/personne/rien/aucun."],
    ["Style indirect libre","Mélange narration/pensées du personnage."],
    ["Connecteurs logiques","or, en revanche, toutefois, par conséquent."],
    ["Idiomatismes","tirer son épingle du jeu, tomber des nues."],
    ["Élisions/liaisons","l’ami, les|z|enfants (euphonie)."],
    ["Expressions figées","il convient de, il s’agit de."],
    ["Faux amis","actuellement/actually, sensible/sensitive."],
    ["Orthographe d’usage","Accents obligatoires (hôpital, évènement*→événement)."],
    ["Concordance des temps","Subordination temporelle et hypothèse."],
    ["Ponctuation","Espace insécable avant : ; ? ! en français."]
  ]],

  // 5) Japanese (Advanced)
  ["japanese_advanced","Japanese (Advanced)",[
    ["敬語 (keigo) 敬体","尊敬語・謙譲語・丁寧語の使い分け。"],
    ["受身・使役受身","～られる／～させられる。"],
    ["可能形の使い分け","～られる／～える、～ことができる。"],
    ["〜ように / 〜ために","目的・手段の区別。"],
    ["原因・理由","〜ので／〜から／〜ため。"],
    ["仮定条件","〜たら／〜なら／〜と／〜ば。"],
    ["取り立て助詞","しか、こそ、でも、まで。"],
    ["省略と照応","主語・目的語の省略と文脈依存。"],
    ["文末表現","〜でしょう／〜らしい／〜ようだ。"],
    ["引用","〜と言う／〜って。"],
    ["否定の焦点","全体否定 vs 部分否定。"],
    ["語順の自由度","主題化で語順入替（は／が）。"],
    ["連体修飾","名詞の前に置く長い節。"],
    ["慣用句","首を突っ込む、耳に入る、手に入れる。"],
    ["オノマトペ高度","さらさら、じめじめ、ぎりぎり。"],
    ["漢字同訓異字","表記の選択とニュアンス。"],
    ["語彙レジスター","カジュアル/フォーマルの切替。"],
    ["外来語","コンセンサス、リスケ、アサイン等の使用。"],
    ["書き言葉 vs 話し言葉","だ／である調 vs です／ます調。"],
    ["敬体バランス","相手・場面に応じた丁寧さ。"]
  ]],

  // 6) Calculus II
  ["calculus2","Calculus II",[
    ["Integration by parts","∫u dv = uv − ∫v du."],
    ["Trigonometric integrals","Use identities (sin², cos², etc.)."],
    ["Trig substitution","x = a sinθ, a tanθ, a secθ patterns."],
    ["Partial fractions","Decompose rational functions for ∫."],
    ["Improper integrals","Infinite limits or unbounded integrands."],
    ["Convergence tests","Integral/comparison/ratio/root/alternating."],
    ["Power series form","∑ a_n (x−c)^n; radius of convergence R."],
    ["Taylor series","f(x)=∑ f^(n)(c)/n! (x−c)^n."],
    ["Maclaurin examples","e^x, sin x, cos x, 1/(1−x)."],
    ["Parametric curves","x(t), y(t); speed = √(x'²+y'²)."],
    ["Arc length","∫ √(1 + (y')²) dx or parametric form."],
    ["Surface of revolution","2π ∫ y √(1+(y')²) dx."],
    ["Sequences limits","Monotone convergence, boundedness."],
    ["Alternating series test","Decreasing to 0 ⇒ convergent."],
    ["Ratio test","lim |a_{n+1}/a_n| < 1 ⇒ convergent."],
    ["Root test","lim √[n]{|a_n|} < 1 ⇒ convergent."],
    ["Power series differentiation","Term-by-term within radius."],
    ["Power series integration","Term-by-term within radius."],
    ["Applications of ∫","Areas, volumes, work, probability (pdf→cdf)."],
    ["L’Hôpital extensions","Indeterminate forms beyond 0/0, ∞/∞."]
  ]],

  // 7) Linear Algebra (Core)
  ["linear_algebra","Linear Algebra",[
    ["Vector space","Set with vector addition and scalar multiplication."],
    ["Basis","Linearly independent set spanning the space."],
    ["Dimension","Number of vectors in a basis."],
    ["Linear independence","No vector is a linear combo of others."],
    ["Matrix multiplication","Row-by-column rule."],
    ["Determinant meaning","Volume scaling; invertibility test (≠0)."],
    ["Inverse matrix","A^{-1} such that AA^{-1}=I."],
    ["Rank","Dimension of column space."],
    ["Null space","Solutions to Ax=0."],
    ["Row-reduction","Gaussian elimination to RREF."],
    ["Eigenvalues/eigenvectors","Av=λv; characteristic polynomial."],
    ["Diagonalization","A=PDP^{-1} if enough eigenvectors."],
    ["Orthogonality","Dot product = 0."],
    ["Gram–Schmidt","Orthonormalize a set."],
    ["Least squares","Solve Ax≈b via normal equations A^T A x = A^T b."],
    ["Projection","Onto subspace via orthonormal basis."],
    ["SVD","A=UΣV^T; singular values."],
    ["Symmetric matrices","Real eigenvalues; orthogonal eigenvectors."],
    ["Change of basis","Coordinate transforms between bases."],
    ["Linear maps","Matrix representation depends on bases."]
  ]],

  // 8) Discrete Mathematics
  ["discrete_math","Discrete Mathematics",[
    ["Propositional logic","Connectives ∧ ∨ ¬ → ↔; truth tables."],
    ["Predicate logic","Quantifiers ∀, ∃."],
    ["Proof techniques","Direct, contrapositive, contradiction, induction."],
    ["Sets & operations","Union, intersection, complement, power set."],
    ["Functions","Injection, surjection, bijection."],
    ["Relations","Reflexive, symmetric, transitive; equivalence classes."],
    ["Counting rules","Addition, multiplication principles."],
    ["Permutations/Combinations","nPr, nCr."],
    ["Binomial theorem","(a+b)^n expansion."],
    ["Pigeonhole principle","If more pigeons than holes → some share."],
    ["Graphs","Vertices/edges; degree; paths; cycles."],
    ["Trees","Acyclic connected graphs; spanning tree."],
    ["Planarity","Kuratowski’s theorem concept (K₅, K₃,₃)."],
    ["Euler/Hamilton paths","Visit edges vs vertices exactly once."],
    ["Recurrence relations","Solve via iteration/characteristic eq."],
    ["Asymptotic notation","O, Ω, Θ bounds."],
    ["Number theory basics","Divisibility, gcd, Euclid’s algorithm."],
    ["Modular arithmetic","a≡b (mod n); inverses."],
    ["RSA idea","Public/private keys via big primes."],
    ["Boolean algebra","Logic gates & simplification."]
  ]],

  // 9) Organic Chemistry II
  ["chemistry_organic2","Chemistry: Organic II",[
    ["Aromatic substitution","Electrophilic substitution on benzene."],
    ["Activating/deactivating groups","Directors (ortho/para vs meta)."],
    ["Friedel–Crafts","Alkylation/acylation of aromatics (AlCl₃)."],
    ["Carbocation rearrangement","Hydride/methyl shifts to stabilize."],
    ["Aldol reaction","Enolate + carbonyl → β-hydroxy carbonyl."],
    ["Claisen condensation","Ester + ester → β-keto ester."],
    ["Grignard reagent","RMgX adds to carbonyls."],
    ["Diels–Alder","[4+2] cycloaddition diene + dienophile."],
    ["S_N1/S_N2/E1/E2","Substitution/elimination mechanisms."],
    ["Protecting groups","Temporarily mask reactive sites."],
    ["Stereoselectivity","Favor one stereoisomer (syn/anti)."],
    ["Enantioselectivity","Chiral products biased to one enantiomer."],
    ["Oxidation of alcohols","PCC to aldehyde; Jones to acid."],
    ["Reduction reagents","LiAlH₄, NaBH₄ differ in strength."],
    ["Carboxylic acid derivatives","Acid chloride > anhydride > ester > amide reactivity."],
    ["Amide formation","Acid derivative + amine."],
    ["NMR basics","¹H shifts/splitting; ¹³C signals carbon types."],
    ["IR bands","C=O ~1700 cm⁻¹; O–H broad ~3300 cm⁻¹."],
    ["Mass spec","m/z peaks; molecular ion M⁺."],
    ["Retrosynthesis","Work backwards from target molecule."]
  ]],

  // 10) Macroeconomics (Advanced)
  ["macroecon_advanced","Macroeconomics (Advanced)",[
    ["GDP components","C + I + G + (X−M)."],
    ["Inflation measures","CPI, PCE, GDP deflator."],
    ["Output gap","Actual − potential GDP."],
    ["Phillips curve","Inflation–unemployment tradeoff (short-run)."],
    ["Natural rate of unemployment","Structural + frictional."],
    ["Okun’s law","Output changes vs unemployment changes."],
    ["IS–LM (concept)","Goods market–money market equilibrium."],
    ["AS–AD model","Aggregate supply/demand dynamics."],
    ["Monetary policy rules","Taylor rule; forward guidance."],
    ["Quantitative easing","Large-scale asset purchases."],
    ["Fiscal multipliers","Size depends on slack, openness, etc."],
    ["Debt sustainability","Debt/GDP, real interest–growth differential."],
    ["Exchange rate regimes","Fixed, floating, managed."],
    ["Balance of payments","Current + capital/financial accounts."],
    ["Twin deficits","Budget and current account links."],
    ["Expectations","Adaptive vs rational."],
    ["Sticky prices/wages","Short-run non-neutrality of money."],
    ["Real business cycle","Shocks to technology/preferences."],
    ["New Keynesian model","Nominal rigidities + microfoundations."],
    ["Secular stagnation (idea)","Persistently low r*, weak demand."]
  ]],

  // 11) Microeconomics (Advanced)
  ["microecon_advanced","Microeconomics (Advanced)",[
    ["Preferences & utility","Completeness, transitivity, continuity."],
    ["Budget constraint","p·x ≤ m; slope −p1/p2."],
    ["Marshallian demand","Utility maximization → demand functions."],
    ["Elasticities","Own-price, cross-price, income."],
    ["Producer theory","Cost, production functions, isoquants."],
    ["Perfect competition","Price-taking; zero profit in long run."],
    ["Monopoly pricing","MR = MC with market power."],
    ["Price discrimination","1st/2nd/3rd degree."],
    ["Oligopoly models","Cournot, Bertrand, Stackelberg."],
    ["Game theory basics","Nash equilibrium, dominance."],
    ["Mixed strategies","Randomization to avoid exploitation."],
    ["Asymmetric information","Adverse selection, moral hazard."],
    ["Signaling/screening","Education as signal; menus for types."],
    ["Auctions","First/second-price, English/Dutch."],
    ["Externalities","Pigouvian taxes/subsidies."],
    ["Public goods","Non-rival, non-excludable; free rider."],
    ["Mechanism design","Incentive compatibility, revelation principle."],
    ["Welfare theorems","Competitive equilibrium efficiency (assumptions)."],
    ["Market failures","Info/market power/externalities/public goods."],
    ["Behavioral econ","Biases, prospect theory, nudges."]
  ]],

  // 12) U.S. History: 20th Century
  ["us_history_20th","U.S. History (20th Century)",[
    ["Progressive Era","Reforms: antitrust, labor, suffrage."],
    ["WWI entry","1917; Zimmerman Telegram, U-boat warfare."],
    ["Great Depression","1929 crash → mass unemployment."],
    ["New Deal","FDR programs: relief, recovery, reform."],
    ["WWII home front","Mobilization, rationing, internment."],
    ["Cold War origins","US–USSR rivalry post-1945."],
    ["Korean War","1950–53; armistice, 38th parallel."],
    ["Civil Rights Movement","Brown v. Board, MLK, Civil Rights Act."],
    ["Vietnam War","Escalation 1960s; protests; 1973 withdrawal."],
    ["Space Race","Apollo 11 moon landing (1969)."],
    ["Watergate","Nixon scandal; resignation 1974."],
    ["Reaganomics","1980s tax cuts, deregulation."],
    ["Sunbelt growth","Population shift to South/West."],
    ["Environmentalism","EPA (1970), Clean Air/Water Acts."],
    ["Women’s movement","2nd-wave feminism; Title IX."],
    ["Immigration shifts","1965 Act; diverse sources."],
    ["Culture wars","Debates on values/education/policy."],
    ["End of Cold War","Soviet collapse 1991."],
    ["Technological change","Computers, internet rise."],
    ["Globalization","Trade/finance integration expanding."]
  ]],

  // 13) U.S. History: 21st Century
  ["us_history_21st","U.S. History (21st Century)",[
    ["2001 attacks","9/11; War on Terror begins."],
    ["Afghanistan/Iraq wars","2001/2003 invasions; long conflicts."],
    ["Great Recession","2007–09 financial crisis."],
    ["Affordable Care Act","2010 health reform law."],
    ["Social media era","New communication/polarization."],
    ["Energy shifts","Fracking boom; renewables growth."],
    ["Demographic change","Aging, diversification, migration."],
    ["SCOTUS landmark cases","Same-sex marriage (2015); others."],
    ["Technological platforms","Gig economy, smartphones, AI growth."],
    ["Trade debates","Global supply chains; tariffs episodes."],
    ["Elections & polarization","High turnout; partisan sorting."],
    ["Climate policy","Paris Agreement participation dynamics."],
    ["Public health crises","Pandemic responses, vaccines."],
    ["Criminal justice debates","Policing reforms, incarceration."],
    ["Economic inequality","Wealth/income concentration issues."],
    ["Education & debt","Student loans, access/affordability."],
    ["Voting/access debates","ID, mail-in, districting."],
    ["Media landscape","Cable/online transformations."],
    ["Space/tech sector","Private launches; Mars probes."],
    ["Civic engagement","Grassroots movements, civic tech."]
  ]],

  // 14) World History: Africa & Asia (Survey)
  ["world_history_regions","World History: Africa & Asia (Survey)",[
    ["Ancient Nile kingdoms","Egypt, Kush/Nubia."],
    ["Trans-Saharan trade","Gold, salt, Islam spread."],
    ["West African empires","Ghana, Mali, Songhai."],
    ["Swahili Coast","City-states trading across Indian Ocean."],
    ["Ethiopian highlands","Christian kingdoms; long continuity."],
    ["Great Zimbabwe","Stone complexes; trade networks."],
    ["South Asian empires","Maurya, Gupta, Mughal."],
    ["Indian Ocean trade","Monsoon-driven maritime routes."],
    ["Chinese dynasties","Han, Tang, Song, Ming, Qing."],
    ["Confucian bureaucracy","Civil service examinations."],
    ["Gunpowder states","Ottomans, Safavids, Mughals."],
    ["Tokugawa Japan","Sakoku isolation; urban culture."],
    ["Colonialism & resistance","Partition of Africa; independence movements."],
    ["Meiji Restoration","Rapid modernization of Japan."],
    ["Chinese revolutions","1911, 1949; PRC formation."],
    ["Green Revolution","Agricultural intensification in Asia."],
    ["Modern African states","Pan-Africanism; regional unions."],
    ["Asian Tigers","Rapid industrialization (HK, SG, SK, TW)."],
    ["21st-century shifts","Belt and Road; tech hubs."],
    ["Cultural continuities","Philosophies/religions shaping society."]
  ]],

  // 15) Ethics & Critical Thinking (Advanced)
  ["ethics_critical_advanced","Ethics & Critical Thinking (Advanced)",[
    ["Consequentialism","Right action judged by outcomes."],
    ["Deontology","Duties/rights independent of outcomes."],
    ["Virtue ethics","Character-centered morality."],
    ["Contractualism","Justification to each person (Scanlon)."],
    ["Care ethics","Relationships/contexts in moral reasoning."],
    ["Moral realism vs anti-realism","Objective moral facts vs constructed/subjective."],
    ["Trolley problems","Tradeoffs; doctrine of double effect."],
    ["Justice theories","Rawls (maximin), Nozick (entitlement)."],
    ["Applied ethics","Bioethics, AI ethics, environmental ethics."],
    ["Privacy & autonomy","Informed consent, data rights."],
    ["Cognitive biases","Anchoring, availability, confirmation."],
    ["Argument structure","Premises, conclusion, validity/soundness."],
    ["Fallacies","Straw man, ad hominem, slippery slope, equivocation."],
    ["Bayesian reasoning","Update beliefs via evidence."],
    ["Burden of proof","Who must provide justification."],
    ["Steel-manning","Strengthen opponent’s argument fairly."],
    ["Principle of charity","Interpret strongest reasonable version."],
    ["Moral uncertainty","Decision under normative disagreement."],
    ["Value pluralism","Multiple incommensurable values."],
    ["Deliberation norms","Clarity, relevance, sincerity, respect."]
  ]]
];

for (const [slug, topic, cards] of packs) writePack(slug, topic, cards);
console.log("🎉 Final batch generation complete.");
