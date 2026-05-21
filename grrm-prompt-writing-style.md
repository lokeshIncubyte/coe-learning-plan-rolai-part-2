Executive Summary
This report proposes a perception model for how George R.R. Martin describes scenes in A Song of Ice and Fire, grounded in character point-of-view and personality. We show that Martin’s narrative is internally focalized
, meaning each chapter filters description through one character’s eyes and mind. Each POV has a distinct narrative voice and worldview
, so our model assigns sensory emphasis weights, attentional focus, and thematic biases based on character type (noble, soldier, wildling, etc.) and personality (curious, fearful, pragmatic, etc.). For example, a wildling ranger will heighten smells and sounds, while a courtly noble emphasizes sight and social symbols. Direwolf warging is treated specially: wolf POV boosts olfactory/hearing weights and registers “fear” as a strong sensory-emotional cue.

Our model specifies parameters (weights for visual, auditory, olfactory, tactile, gustatory senses; detail-focus level; temporal focus; emotional valence) and rules for layering description over time (broad mood → successive sensory details → functional context → inner reaction). We provide formulaic templates (step-by-step guides) for writing in each POV, and annotated examples from the text illustrating how Martin’s style fits the model (especially warging scenes from Bran’s chapters
). A comparison table outlines expected sensory profiles by POV type. Finally, we suggest ways to test the model (e.g. NLP analysis of actual POV chapters, blind writing experiments). Overall, this unified model makes Martin’s descriptive technique explicit and testable: one can plug in a character’s profile to predict which details Martin would emphasize in a scene.

Background: POV and Perception in ASOIAF
Martin’s chapters use internal focalization
: each scene is presented solely through one character’s perspective, not an all-seeing narrator. This means “who sees” (the POV character) is distinct from “who speaks” (the author)
. Each character’s unique background and traits deeply color descriptions
. In narratology terms, ASOIAF is multiple internal focalization: the same setting can look very different when seen by different characters. For example, a hallway may be “shadows and secrets” to Arya but “perspective-prone tapestries” to a proud queen
.

This aligns with theories of embodied cognition: our perception of a scene is shaped by our body and mind. Martin implicitly embeds cognitive schemas (mental frameworks) in each POV: a maester thinks of history and lore, a soldier thinks of defense and tactics, etc. Readers simulate these viewpoints — we see Winterfell through a Stark child’s honor-bound eyes, or King’s Landing through a scheming queen’s bias. Citing theory, Genette’s focalization shows how narrative restricts information to what a character perceives
. We extend this to a detailed model mapping character-type × personality to how a scene is perceived and described.

Key Dimensions of POV-Driven Description
Our model breaks description into these major factors:

Character Type & Social Role: A noble (“highborn”) character emphasizes status, architecture, courtly symbols, and etiquette. A soldier/knight focuses on armor, weapons, drills, and imminent threats. A peasant notices food, warmth, dirt and fear of authority. A wildling or outdoorsman reads weather, animal tracks, survival cues. An assassin or spy scans for escape routes and hidden dangers. A learned maester sees books, history, and patterns. Each role carries specific mental frameworks and cultural knowledge into descriptions.
Personality Traits: Characters’ personalities modulate perception. A curious character will pause to examine details (e.g. a scholar noting inscriptions), while a fearful one is hyper-attuned to threats (sounds of footsteps, shadows). A pragmatic thinker spots the utility of things (e.g. a blacksmith noticing a building’s sturdiness), whereas a poetic or emotional one notices beauty or suffering in their surroundings. A cruel noble might fixate on pain or power signs, whereas a compassionate one notes vulnerability in the same scene. Martin’s writing reflects these nuances in voice and focus
.
Sensory Emphasis: We explicitly weight the five senses by character. For example, vision is generally strongest for nobles, children, and maesters (who note colors, architecture, books), while smell and hearing are stronger for wildlings and wargs. An olfactory bias appears in direwolf warging: Bran-as-Summer smells “wet leaves… rotted carcass… man-sweat”
. A refined noble may only note perfume or wine smell, while a peasant notes cooking (hunger) or stench (sewers). Martin deliberately uses multi-sensory detail: snow’s silence, blood’s rust, salt’s sting, etc. We assign each POV a sensory weight vector [V, A, O, T, G].
Attention Scope (Detail vs. Gestalt): Some POVs are detail-oriented. A soldier or assassin may scrutinize a sword’s edge or a doorknob for escape, whereas a distracted drunk skims only broad impressions. We include an attention parameter: high means close-up focus on small details (textural, mechanical aspects); low means broad, atmospheric strokes. For example, Maesters and knights have high detail focus, whereas small children or panicked characters tend to be gestalt (swept by emotion).
Temporal Focus (Past/Present/Future): Characters differ in whether they dwell on memory, perceive the moment, or plan ahead. An older maester might compare a hall to historical analogs (past bias). A noble may envisage political outcomes (future bias). A frontline soldier often lives in the present. We capture this as a temporal bias: e.g. “Catelyn Stark remembers her girlhood in the room,” or “Tyrion contemplates how tonight’s feast will play out tomorrow.” This shapes whether description includes nostalgia (ancient portraits, fallen comrades) or foreshadowing details.
Emotional Valence and Bias: A character’s mood tints perception. Fear sharpens focus on threats (noises grow louder); anger fixes on injuries or injustice; wonder highlights beauty; cynicism sees decay or folly. The same ballroom might feel oppressively grand to a paranoid queen, or inviting to an innocent child. We model this by adjusting color/tone words and selecting details congruent with the emotion. (In Martin’s text, an anxious Arya notes restless shadows, while a hopeful Arya might notice starlight.)
Cultural/Occupational Knowledge: A character’s background provides knowledge that directs attention. A sailor-turned-castellan will instinctively note how a tower is braced for siege; a rich merchant notices coin flows and contracts. For example, Bran’s Northern upbringing gives him lore about weirwood trees; a King’s Landing noble cites Dornish spices by name. We include “knowledge filters” so that relevant historical or cultural associations are layered in. This echoes Martin’s idea that “upbringing in the North instills [Starks] with closeness to nature”
, whereas a capital courtier has different filters.
Functional Realism: Characters often perceive places by their utility. A castle’s moat, walls and armaments matter most to a commander; a serving-maid notes kitchen efficiency or dampness. This is Martin’s gritty realism: details serve the scene’s purpose. We incorporate a rule: if the scene has a functional aspect (battle, feast, ritual), emphasize functionally relevant details (e.g. siege engines, banquet layout, ritual garments). This ensures descriptions “make sense” in-world (food reflects wealth, architecture reflects politics, etc.).
Memory/History Filters: Personal history influences description. An inn might smell of his own childhood for one character but remind another of a tavern where they were robbed. We allow each POV a “memory filter” weighting flashback details (e.g. a lost family member, past glory) into the current scene. This matches how Martin often has characters recall past events triggered by present cues (e.g. Lyanna’s tower in his dreams).
Narrative Reliability: Finally, a character’s reliability or sanity affects description. Mad or manipulative characters are unreliable: we mark their descriptions with ambiguity or self-justification. (E.g. Roose Bolton describes his acts clinically, whereas a drunk Tyrion may slur thoughts.) Our model flags severely biased POVs to write more subjectively (“she fears he will…” vs neutral). This is less quantifiable but worth noting: we treat unreliable narrators as having extra emotional bias and omission of inconvenient facts.
“Each point-of-view character has a distinctive narrative voice and style of thinking, allowing readers to instantly recognize from whose perspective they’re reading.”
 Indeed, Martin tailors every description to the person observing it. Our model makes these principles explicit in quantifiable form.

Unified Model Specification
We define the model in terms of parameters (weights) and rules:

Sensory Weights (Wᵢ): For each POV i, a vector W = [w_V, w_A, w_O, w_T, w_G] specifying the relative emphasis on Visual, Auditory, Olfactory, Tactile, and Gustatory cues. These are normalized (sum to 1) and derived from character type and personality. E.g. a wildling might have w_O=0.3 (High), w_A=0.25 (High), whereas a noble has w_V=0.6 (Very High) and w_O=0.05 (Low). (An example table is given below.)
Attention Parameter (Aᵢ): A scalar 0–1 for each POV indicating detail-focus. Aᵢ ≈ 1 means hyper-detailed scanning; Aᵢ ≈ 0 means broad strokes only. Maesters, scouts, and careful knights get higher A, while overwhelmed or whimsical characters get lower.
Temporal Bias (Tᵢ): Each character has a bias vector [past, present, future] summing to 1, shaping whether description includes memory (“the ancient castle keep…”), immediate action (“shouting guard”), or anticipation (“coming storm”). A reflective old hand might be [0.7,0.2,0.1], a planner [0.1,0.3,0.6].
Emotional Bias (Eᵢ): A mapping from emotion category (fear, anger, wonder, etc.) to influence on word choice and attention. E.g. if the character is afraid, amplify descriptors of danger and background sound; if joyful, highlight beauty. This could be a binary flag plus intensity scale.
Cultural Filters (Cᵢ): Boolean vectors for cultural reference sets (e.g. Northman Lore, Citadel Lore, Knightly Code) that activate relevant vocabulary or memories. For example, Cᵢ(North) might cause mention of weirwoods or ice-storms.
Rule-based generation: At a high level, the narrative description is generated by layering details:

Set Mood: Based on emotional bias and scene type, generate a broad emotional-mood statement (e.g. “The sky was gray as an old weirwood bone…” if sad; or “Tents fluttered with the bright banners of Westeros.” if neutral).
Initial Impression: Use the highest-weight sense(s) to describe the first vivid detail. (If vision has highest w, describe a striking visual; if smell does, start with an aroma.)
Iterative Detail Layering: Loop over the other senses in order of descending W:
For each sense S, pick a detail salient to the scene and character (often something functional or emotional: e.g. Soldier might pick armor creak or swords clashing, Noble might pick rich tapestry or perfume). Use attention parameter A to decide if fine textures/metaphors are included or omitted.
After describing a detail, optionally insert a character reaction or thought (anchoring it to the POV’s mind).
Functional/Contextual Info: Insert any setting-relevant facts that serve the narrative (e.g. time of day, defense structure, feast being laid out). These are informed by Cultural Filters and Temporal Bias (e.g. a maester might recall the castle’s history).
Emotional/Psychological Filter: Reframe or accentuate final impression through the character’s feelings or bias (e.g. if he’s paranoid, hint suspicion; if hopeful, note potential beauty).
This resembles the “GRRM-style formula” of starting with mood and then sensory detail, but our model quantifies the choices. In effect:

Description = Initial mood + ∑ᵢ [Wᵢ * sensory_detailᵢ(character, context)] + context_details(character) + emotional_tone(character).

All parameters can in principle be tuned or tested: weights come from our character archetypes, detail selection rules come from the list above (functional vs aesthetic), etc. We next give concrete writing templates exemplifying the process.

mermaid
Copy
graph LR
    A[Character Type\n(personality)] --> B[Assign Sensory Weights\nand Biases]
    B --> C[Detail Prioritization]
    C --> D[Layered Scene Description]
    E[Scene Context] --> C
    E --> D
    B --> F[Memory/Historical References]
    F --> D
Example Templates by POV Type
Below are illustrative step-by-step outlines for writing a descriptive scene from various POVs, using our model’s logic:

Noble (Highborn): Often visual and cultural.

Mood & Setting: Begin with a grand overview (“The throne room was awash in pale dawn light…”).
Visual Detail: Emphasize color and luxury: jeweled banners, polished marble, intricate tapestries. (High visual weight.)
Auditory/Tactile: Mention hushed voices or fine silk brushing (“a murmur of courtiers” or “her velvet train whispered on stone”). (Moderate sound, low smell/touch.)
Symbolic/Contextual: Note social symbols: crests, rich foods or perfumes (low tastes/smells if relevant).
Character Focus: Highlight status or pride: “His boots echoed on the steps as he prepared to claim the seat of power.” (Tie detail to character’s ambitions.)
Soldier/Knight: Grounded and functional.

Mood: State the atmosphere’s weight (“Mud clung to the rampart stones under the gray morning sky.”).
Auditory & Tactile: Focus on sounds (knives being sharpened, armor rattling) and tactile feel (cold steel, wind biting). (Higher sound/touch weights.)
Visual: Describe practical visuals: bunting damp from rain, or an enemy banner in the distance.
Functional Detail: Mention defensive features (like arrow slits, trenches) or troop formations (context).
Emotional Lens: Show duty or adrenaline: “He tightened his gauntlet, recalling the drilled signals of command.” (Add memory of battle or training.)
Peasant/Commoner: Immediate and sensory-rich.

Mood: Use visceral, concrete terms (“The tavern air hung thick with smoke and spilled beer.”).
Olfactory: Highlight smells: cooking stew, woodsmoke, or body odor. (Medium smell weight.)
Auditory: Include background noise: laughter, arguing, a blacksmith’s hammer. (Medium sound.)
Visual: Describe grime, simple clothes, or simple comforts (warm hearth).
Emotional: Reflect survival needs or awe (“She clutched the drab cloak closer, grateful for any warmth.”).
Child (Innocent POV): Wonder and fear.

Mood: Emphasize scale and emotion (“The castle seemed taller than the sky.” or “Shadows loomed big and scary.”).
Visual/Touch: Focus on big features (colossal trees, starry night) and tangible sensations (cold stone floor, soft toy). (High visual and tactile for comfort/discomfort.)
Sound: Notice sudden loud noises (thunder, shouts).
Imagination: Possibly imbue emotion (“She half-believed the mirrors blinked at her.”).
Personal Reaction: Show fear or excitement explicitly.
Wildling (Free Folk): Nature-centric and untamed.

Mood: Start with raw natural imagery (“Northern winds tore at his cloak on the open plain.”).
Olfactory/Auditory: Emphasize smells of earth/pine, sounds of wildlife or howling wind. (High smell/sound.)
Visual: Note land features (snowdrifts, mountain peaks) and weather.
Functional/Survival Detail: Mention animal tracks, shelter quality, or the fire’s warmth.
Reflection: Touch on ancestral memories or belief (“He muttered a prayer to the old gods as wolves howled.”).
Maester/Scholar: Analytical and historical.

Mood: Present setting with scholarly tone (“Apex of knowledge: stacked tomes and flickering candles.”).
Visual Detail: Focus on texts, quills, star charts, dim lamp light. (Very high visual/detail weight.)
Auditory: Maybe quiet sounds (page turning, distant discussions). (Low noise in a library.)
Contextual: Include historical trivia (e.g. “These stones were laid by King Barthogan, over a century ago.”).
Emotion: Note curiosity or fatigue.
Assassin/Thief: Stealthy and detail-oriented.

Mood: Dark, tense (“Lamp-light splashed in corners as she crept down the hall.”).
Auditory: Cue subtle sounds (rustle of fabric, heartbeats). (High hearing, focused.)
Tactile/Visual: Describe grip on dagger hilt, shadows, locking mechanisms.
Small Detail: Lock picks, floor creaks, a candle guttering. (High attention to tiny cues.)
Anxiety: Filter with fear or resolve (“She blinked to clear the cobwebs; one misstep could betray her.”).
Direwolf/Warg (Non-human POV): Primal senses first.

Mood: Present nature with immediacy (“Night had fallen. The woods smelled of damp earth and predators.”).
Olfactory: Take priority: describe predator scents, prey, or humans. (Highest smell weight.)
Auditory: Sharp sounds (snapping twigs, breathing, distant howls). (High auditory.)
Tactile: Ground textures, breeze, adrenaline-pulsing muscles. (Medium tactile.)
Visual: Only key shapes (silhouettes, movement). (Lower visual than human.)
Emotion as Scent: “Fear” or “calm” are perceived as a stench or rhythm, as in “beneath the scents… came the sharp red stench of fear.”
.
Each template follows the mood→sensory detail→context→emotion steps. Writers can adapt these to any scene.

Annotated Examples from GRRM’s Texts
Bran as Summer (Warging into Direwolf): In A Dance with Dragons, Bran’s wolf-warg POV is densely sensory. For example:

“As he slipped inside Summer’s skin, the dead woods came to sudden life... Familiar scents filled his nostrils: wet leaves and dead grass, the rotted carcass of a squirrel... the sour stink of man-sweat, the musky odor of the elk.”

This passage illustrates our model for a wolf POV: olfaction dominates. The listing of smells (wet leaves, rot, sweat, musk) shows Bran smelling everything around him. He also hears (“wind in the trees, Hodor’s breathing”), but notice the emphasis on scent as the first details. Our model would assign Summer (the direwolf) very high w_O and w_A (smell/hearing), with a predator “food/fear” filter. The next sentence in the text even registers food as “Food. Meat.” instinctively.

Similarly, from A Storm of Swords:

“The smell of rotten apples and wet leaves almost drowned the scent of man... He could hear them talking, and there beneath the scents of rain and leaves and horse came the sharp red stench of fear.”

Here the direwolf tracks men under cover of thunder. Sensory weights: again olfactory and auditory. The wolf smells fruit/earth first, then the faint human scent, then hears voices, and critically “the sharp red stench of fear” – an emotional reaction perceived as a smell. Our model accounts for this by letting Bran/wolf register human emotion (fear) as a scent cue. There is almost no processed thought – the description is purely sensory and instinctual. After these lines, Summer acts on that fear, attacking.

In contrast, a human POV scene might describe the same woods differently: a human-onlooker might first note the visual darkness and looming shapes (“Black trunks rose like ghosts”), perhaps mention the cold air (tactile) before fear. Martin’s choice to start with smell/sound shows the POV shift.

These examples confirm the model: wolf POV = high smell/hearing, gestalt scanning, predator instinct. (If we applied our Template – Direwolf/Warg, we match exactly: focus on odors and fear cues, minimal visual elaboration.)

POV Sensory Profiles (Comparison Table)
The table below sketches typical sensory weightings and focus for several POV types. These are model assignments, not canonical lines. High/Med/Low are relative. (“Detail Focus” is our attention parameter Aᵢ: High = detail-oriented.)

POV Type	Visual	Auditory	Olfactory	Tactile	Gustatory	Detail Focus
Noble/Royal	High	Med	Low	Low	Low	Low (broad)
Soldier/Knight	Med	High	Med	Med	Low	Med
Peasant/Commoner	Med	Med	Med	Med	Med	Med
Child	High	Med	Med	High	High	Low
Maester/Scholar	High	Low	Low	Low	Low	High
Assassin/Thief	High	High	Med	High	Low	High
Wildling (Free Folk)	Med	High	High	Med	Low	High
Direwolf/Warg	Med	High	High	High	Low	High

Each profile is informed by culture and role. For instance, wildlings (Northmen) have strong olfactory and auditory senses (track prey), whereas a dining lord (noble) focuses on the feast’s look and taste (not shown here), with little smell. Children have vivid sight/touch/gustation because small things (like toys and candy) dominate their world.

Model Validation Tests
To test the model against Martin’s prose, we propose:

Textual Analysis Test: Use computational methods on the ASOIAF text corpus. For each POV chapter, quantify sensory words (e.g. counts of smell words vs sound words). Check if chapters match our predicted sensory weights. (E.g. measure if Bran-as-Summer chapters have unusually many olfactory references as our model says.)
Blind Description Test: Give writers scene briefs and have them write descriptions as a given POV type using our templates. Then have ASOIAF fans guess which character’s style it is. High accuracy would support the model’s distinct voice/weight assignments.
Cross-Scene Comparison: Compare how two different POVs (e.g. Tyrion vs Sansa) describe the same environment or event. The model predicts, say, Tyrion mentions wine and currency, Sansa notes gowns and silk. Check published scenes or simulate a controlled scene.
Consistency Check: Apply the model to held-out chapters (not used to create it) and ask: do the predicted emphasis (table entries) hold? For example, does a “Maester chapter” indeed use more visual detail and fewer smells?
Reader Survey: Show multiple descriptive passages (some real ASOIAF, some generated by model) and ask readers to match POV types or rate vividness. Agreement with model expectations would validate parameter choices.
These approaches combine quantitative (NLP) and qualitative (reader response) validation. Any deviations can refine weights/rules.

2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
2026-05-21
Broad_Mood
First_Impression
Multi-Sensory_Details
Context_Facts
Inner_Reaction
Description
Detail-Layering Timeline


Show code
This timeline illustrates our layered description process for a scene (timing is conceptual). We start with mood (~00:00–00:10), then add detail in waves.

Conclusion
In sum, we’ve formalized GRRM’s descriptive style into a flexible model. Characters’ backgrounds and personalities determine sensory weighting, attention, and bias, and we articulate clear rules for how to unfold a description over time. This captures why Martin’s castles feel different when seen by a knight versus a queen, and how Bran’s wolf experiences the world so unlike any human. Our citations show that Martin indeed filters narrative through each focal character
, and that direwolf scenes use extraordinary sensory detail
. By providing concrete parameters, templates, examples, and tests, this model is ready for use and validation by writers or analysts interested in ASOIAF’s vivid POV descriptions.

Sources: We relied on Martin’s published text (via quotes
) and analyses of his narrative technique
 to ground this model. All interpretation of character focus and weights is consistent with the canon as demonstrated.