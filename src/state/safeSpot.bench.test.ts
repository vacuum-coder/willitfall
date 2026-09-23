import { describe, it, expect } from 'vitest';
import { safeBedSpot } from './safeSpot';
import { initialState } from './roomReducer';
import { PANEL_BEDROOM, DEFAULT_SETTINGS } from '../data/presets';
import { assessRoom } from '../physics/assess';

// The search runs on the main thread on every change of the room, so it must stay cheap.
// Counting the exact polygon checks instead of milliseconds keeps the test honest on a busy machine.
describe('how much work the search does', () => {
  it('checks only a handful of places, not the whole room', () => {
    const room = initialState(PANEL_BEDROOM).room;
    const zones = assessRoom(room, DEFAULT_SETTINGS, { pfa7G: 0.3342 }).assessments
      .filter((a) => a.fallsNow).flatMap((a) => a.zones);
    const bed = room.items.find((i) => i.kind === 'bed')!;
    const stats = { checks: 0 };
    const spot = safeBedSpot(room, zones, bed.id, stats);
    expect(spot).not.toBeNull();
    // About 3000 grid places per orientation; the outline test must run for only a few of them.
    expect(stats.checks).toBeLessThan(50);
  });
});
