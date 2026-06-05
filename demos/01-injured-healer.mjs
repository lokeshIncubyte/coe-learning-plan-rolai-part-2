/**
 * Demo 01: Injured Healer
 *
 * Injects "Lady Vethara" — a noble healer with hp:20 and mood:desperate.
 * Tests that semantic recall surfaces her when her name or role is mentioned,
 * and that the narrative reflects her wounded state and tent location.
 *
 * Run: node demos/test-loop.mjs demos/01-injured-healer.mjs
 */

export const scenario = {
  name: 'injured-healer',
  entity: {
    name: 'Lady Vethara',
    deltas: [
      {
        op: 'new_entity',
        identity: {
          name: 'Lady Vethara',
          type: 'noble',
          archetype: 'healer',
          backstory:
            'The village healer who was struck by a stray arrow during the last raid, now tending her own wounds in the market tent.',
          role: 'caretaker',
          sensoryProfile: 'smell+touch',
        },
        state: {
          hp: 20,
          mana: 60,
          mood: 'desperate',
          location: "healer's tent",
          status: 'wounded',
        },
      },
    ],
  },
  prompts: [
    "Lady Vethara calls out from the healer's tent",
    'I find Lady Vethara and ask if she needs aid',
  ],
  assertions: [
    { label: 'narrative mentions "Vethara"',
      test: t => /vethara/i.test(t) },
    { label: 'narrative reflects injured/wounded state',
      test: t => /wound|injur|hurt|pale|weak|bleed|strain|pain|ache|bandage|tremble|trembl|limp|falter|stagger|comfrey|yarrow|shak/i.test(t) },
    { label: 'narrative surfaces correct location',
      test: t => /tent|market|canvas|flap/i.test(t) },
    { label: 'narrative shows distress (desperate mood)',
      test: t => /desperat|fraught|grim|hollow|haggard|drawn|shadow|hitch|tremble|trembl|taut|grip|brace|tight|clinch|clench|wince|flinch/i.test(t) },
  ],
}
