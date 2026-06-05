/**
 * Demo 02: Stat Update Reflected in Chat
 *
 * Step A — inject "Gareth the Scout" at full health and confident mood.
 * Step B — apply a state_mutation that drops his hp to 15 and mood to "shaken".
 * Step C — verify the narrative reflects the degraded state, not the original.
 *
 * This tests the full round-trip: entity creation → stat delta → semantic
 * recall → narrative grounding.
 *
 * Run: node demos/test-loop.mjs demos/02-stat-update.mjs
 */

export const scenario = {
  name: 'stat-update',
  entity: {
    name: 'Gareth the Scout',
    deltas: [
      // Step A: create at full health
      {
        op: 'new_entity',
        identity: {
          name: 'Gareth the Scout',
          type: 'scout',
          archetype: 'ranger',
          backstory:
            'A wiry young scout who knows every trail between Thornwall and the Cavern. Usually confident, light-footed, quick to laugh.',
          role: 'guide',
          sensoryProfile: 'sound+touch',
        },
        state: { hp: 95, mood: 'confident', location: 'forest trail', status: 'active' },
      },
      // Step B: immediately degrade his state in the same injection batch
      {
        op: 'state_mutation',
        entityName: 'Gareth the Scout',
        patch: { hp: 15, mood: 'shaken', status: 'injured' },
      },
    ],
  },
  prompts: [
    'Gareth the Scout limps out from the tree line',
    'I hear Gareth calling for help on the trail',
  ],
  assertions: [
    { label: 'narrative mentions "Gareth"',
      test: t => /gareth/i.test(t) },
    { label: 'narrative reflects low hp / injury (stumbling, rough, caught, jolt)',
      test: t => /limp|stagger|wound|pale|weak|bleed|injur|hurt|caught|jolt|rough|falter|stumbl|drag|heavy|crumple|sway|lean|clutch|brace|hitch|strain/i.test(t) },
    { label: 'narrative surfaces shaken / distress',
      test: t => /shaken|afraid|tremble|trembl|startl|pale|panic|breath|urgent|rough|hitch|hollow|tight|taut|wince|flinch|clench|clutch|grip/i.test(t) },
    { label: 'narrative does NOT portray him as healthy',
      test: t => !/\bspring\b|\blaugh\b|\bcheer\b|\bconfident\b|\bstrides\b/i.test(t) },
  ],
}
