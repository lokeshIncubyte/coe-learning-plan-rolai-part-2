/**
 * Demo 03: New Location Grounds Narrative
 *
 * Injects "The Amber Forge" — a recently abandoned blacksmith's workshop on
 * the village edge. Tests that the narrative grounds itself in the new location
 * when the player enters it, surfaces its sensory details (fire, metal, dust)
 * and reflects its abandoned/quiet state.
 *
 * This tests location-type entities with non-character state schemas.
 *
 * Run: node demos/test-loop.mjs demos/03-new-location.mjs
 */

export const scenario = {
  name: 'new-location',
  entity: {
    name: 'The Amber Forge',
    deltas: [
      {
        op: 'new_entity',
        identity: {
          name: 'The Amber Forge',
          type: 'location',
          archetype: 'workshop',
          backstory:
            'A blacksmith\'s forge on the eastern edge of Thornwall, shuttered three winters ago when the smith left for the city. The bellows are stiff, the anvil cold, but the smell of iron and old ash lingers.',
          role: 'landmark',
          sensoryProfile: 'smell+sound',
        },
        state: {
          explored: false,
          light: 'dim',
          mood: 'quiet',
          status: 'abandoned',
          temperature: 'cold',
        },
      },
    ],
  },
  prompts: [
    'I push open the door of the Amber Forge',
    'we shelter inside the old forge at the edge of the village',
  ],
  assertions: [
    { label: 'narrative mentions "forge" or describes a smithy',
      test: t => /forge|amber|anvil|bellows|smith|iron work|ironwork|hearth/i.test(t) },
    { label: 'narrative uses smell or sound sense first',
      test: t => /smell|scent|dust|ash|iron|metal|creak|echo|groan|hinge|still|tang/i.test(t) },
    { label: 'narrative reflects abandoned/cold state',
      test: t => /abandon|cold|still|quiet|disuse|cobweb|rust|shutter|faded|gone|ghost|hollow|empty|silent|sag|splinter|warp|damp|decay/i.test(t) },
    { label: 'narrative avoids active fire/working imagery',
      test: t => !/roar of fire|\bblaze\b|hammer rings|clang of metal|fire burn|forge is hot/i.test(t) },
  ],
}
