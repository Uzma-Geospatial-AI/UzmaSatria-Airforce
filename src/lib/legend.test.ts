import { describe, it, expect } from 'vitest';
import {
  LEGEND_SECTIONS,
  activeLegend,
  legendItemCount,
  PHANTOM_PURPLE,
} from './legend';

/** The page's own starting state: nothing switched on. */
const ALL_OFF: Record<string, boolean> = Object.fromEntries(
  LEGEND_SECTIONS.map((s) => [s.id, false]),
);

describe('LEGEND_SECTIONS', () => {
  it('gives every section a unique id', () => {
    const ids = LEGEND_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never ships an empty section', () => {
    for (const section of LEGEND_SECTIONS) {
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('gives every item a real hex colour and a label', () => {
    for (const section of LEGEND_SECTIONS) {
      for (const item of section.items) {
        expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(item.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every ramp a second colour to ramp to', () => {
    for (const section of LEGEND_SECTIONS) {
      for (const item of section.items) {
        if (item.shape === 'ramp') expect(item.toColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('activeLegend', () => {
  it('shows nothing when every layer is off', () => {
    expect(activeLegend(ALL_OFF)).toEqual([]);
  });

  it('shows only the sections whose layer is on', () => {
    const sections = activeLegend({ ...ALL_OFF, earthquakes: true });
    expect(sections.map((s) => s.id)).toEqual(['earthquakes']);
  });

  it('accumulates sections as more layers come on', () => {
    const sections = activeLegend({ ...ALL_OFF, earthquakes: true, fires: true, cctv: true });
    expect(sections.map((s) => s.id).sort()).toEqual(['cctv', 'earthquakes', 'fires']);
  });

  it('treats an absent key as off for ordinary layers', () => {
    // An empty state leaves only the draw-unless-disabled sections standing.
    expect(activeLegend({}).map((s) => s.id).sort()).toEqual(
      ['conflict_zones', 'sdk_air', 'sdk_naval', 'sdk_sea'],
    );
  });

  it('keeps draw-unless-disabled layers hidden only on an explicit false', () => {
    expect(activeLegend({}).map((s) => s.id)).toContain('sdk_sea');
    expect(activeLegend({ sdk_sea: false }).map((s) => s.id)).not.toContain('sdk_sea');
  });

  it('preserves the registry order rather than toggle order', () => {
    const sections = activeLegend({ ...ALL_OFF, cctv: true, flights: true });
    expect(sections.map((s) => s.id)).toEqual(['flights', 'cctv']);
  });
});

describe('activeLegend — ghost theme', () => {
  it('flattens themable swatches to the phantom hue', () => {
    const core = activeLegend({ ...ALL_OFF, flights: true }, 'core');
    const ghost = activeLegend({ ...ALL_OFF, flights: true }, 'ghost');
    expect(core[0].items[0].color).toBe('#00E5FF');
    expect(ghost[0].items[0].color).toBe(PHANTOM_PURPLE);
  });

  it('leaves unthemable swatches alone', () => {
    const ghost = activeLegend({ ...ALL_OFF, gdelt_events: true }, 'ghost');
    expect(ghost[0].items.map((i) => i.color)).not.toContain(PHANTOM_PURPLE);
  });

  it('does not mutate the shared registry', () => {
    activeLegend({ ...ALL_OFF, flights: true }, 'ghost');
    const flights = LEGEND_SECTIONS.find((s) => s.id === 'flights')!;
    expect(flights.items[0].color).toBe('#00E5FF');
  });
});

describe('legendItemCount', () => {
  it('is zero for no sections', () => {
    expect(legendItemCount([])).toBe(0);
  });

  it('sums the swatches across sections', () => {
    const sections = activeLegend({ ...ALL_OFF, weather: true, fires: true });
    // Severe weather carries two swatches, fires one.
    expect(legendItemCount(sections)).toBe(3);
  });
});
