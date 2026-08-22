import { describe, it, expect } from 'vitest';
import {
  IMAGERY_SCENES,
  IMAGERY_OVERLAYS,
  IMAGERY_PANEL,
  overlaysForScene,
  sceneUrl,
  sceneCenter,
} from './imageryScenes';

describe('IMAGERY_SCENES', () => {
  it('keeps every scene id unique', () => {
    const ids = IMAGERY_SCENES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every scene a plausible bounding box', () => {
    for (const s of IMAGERY_SCENES) {
      const [w, so, e, n] = s.bounds;
      expect(w).toBeLessThan(e);
      expect(so).toBeLessThan(n);
      expect(w).toBeGreaterThanOrEqual(-180);
      expect(e).toBeLessThanOrEqual(180);
      expect(so).toBeGreaterThanOrEqual(-90);
      expect(n).toBeLessThanOrEqual(90);
    }
  });

  it('gives every scene a zoom range the archive could hold', () => {
    for (const s of IMAGERY_SCENES) {
      expect(s.minzoom).toBeLessThan(s.maxzoom);
      expect(s.minzoom).toBeGreaterThanOrEqual(0);
      expect(s.maxzoom).toBeLessThanOrEqual(24);
    }
  });

  it('dates parse and are ISO ordered', () => {
    for (const s of IMAGERY_SCENES) {
      expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.date))).toBe(false);
    }
  });
});

describe('sceneUrl', () => {
  it('routes a CORS-less archive through the proxy', () => {
    const scene = IMAGERY_SCENES.find((s) => s.proxy)!;
    expect(sceneUrl(scene)).toBe(`/api/pmtiles?url=${encodeURIComponent(scene.url)}`);
  });

  it('leaves an archive that sets its own CORS alone', () => {
    const direct = { ...IMAGERY_SCENES[0], proxy: false };
    expect(sceneUrl(direct)).toBe(direct.url);
  });

  it('encodes the target so its query string cannot leak into ours', () => {
    const scene = IMAGERY_SCENES.find((s) => s.proxy)!;
    expect(sceneUrl(scene)).not.toContain('://');
  });
});

describe('sceneCenter', () => {
  it('is the midpoint of the bounds', () => {
    for (const s of IMAGERY_SCENES) {
      const [w, so, e, n] = s.bounds;
      const c = sceneCenter(s);
      expect(c.lng).toBeCloseTo((w + e) / 2, 9);
      expect(c.lat).toBeCloseTo((so + n) / 2, 9);
    }
  });
});

describe('IMAGERY_OVERLAYS', () => {
  it('keeps every overlay id unique, and distinct from the scene ids', () => {
    const ids = [...IMAGERY_SCENES.map((s) => s.id), ...IMAGERY_OVERLAYS.map((o) => o.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every overlay at a scene that exists', () => {
    const sceneIds = new Set(IMAGERY_SCENES.map((s) => s.id));
    for (const o of IMAGERY_OVERLAYS) expect(sceneIds.has(o.scene)).toBe(true);
  });

  it('gives every palette entry and fallback a real hex colour', () => {
    for (const o of IMAGERY_OVERLAYS) {
      expect(Object.keys(o.palette).length).toBeGreaterThan(0);
      for (const c of Object.values(o.palette)) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(o.fallbackColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('lands each overlay centre inside its parent capture', () => {
    for (const o of IMAGERY_OVERLAYS) {
      const scene = IMAGERY_SCENES.find((s) => s.id === o.scene)!;
      const [w, so, e, n] = scene.bounds;
      expect(o.center.lng).toBeGreaterThanOrEqual(w);
      expect(o.center.lng).toBeLessThanOrEqual(e);
      expect(o.center.lat).toBeGreaterThanOrEqual(so);
      expect(o.center.lat).toBeLessThanOrEqual(n);
    }
  });

  it('fetches over https, since the browser loads it directly', () => {
    for (const o of IMAGERY_OVERLAYS) expect(o.url.startsWith('https://')).toBe(true);
  });
});

describe('overlaysForScene', () => {
  /* Driven off the registry rather than naming scenes, so adding an overlay to
     a capture that previously had none does not turn into a false failure. */
  it('returns exactly the overlays declared against each capture', () => {
    for (const s of IMAGERY_SCENES) {
      const expected = IMAGERY_OVERLAYS.filter((o) => o.scene === s.id).map((o) => o.id);
      expect(overlaysForScene(s.id).map((o) => o.id)).toEqual(expected);
    }
  });

  it('accounts for every overlay across all the captures', () => {
    const gathered = IMAGERY_SCENES.flatMap((s) => overlaysForScene(s.id).map((o) => o.id));
    expect(gathered.sort()).toEqual(IMAGERY_OVERLAYS.map((o) => o.id).sort());
  });

  it('returns nothing for an id that is not a scene at all', () => {
    expect(overlaysForScene('nope')).toEqual([]);
  });
});

describe('IMAGERY_PANEL', () => {
  it('lists every scene and every overlay exactly once', () => {
    expect(IMAGERY_PANEL).toHaveLength(IMAGERY_SCENES.length + IMAGERY_OVERLAYS.length);
    const keys = IMAGERY_PANEL.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('places each overlay directly under the capture it came from', () => {
    for (const o of IMAGERY_OVERLAYS) {
      const sceneAt = IMAGERY_PANEL.findIndex((e) => e.key === o.scene);
      const overlayAt = IMAGERY_PANEL.findIndex((e) => e.key === o.id);
      expect(sceneAt).toBeGreaterThanOrEqual(0);
      expect(overlayAt).toBe(sceneAt + 1);
    }
  });

  it('offers an opacity slider for captures but not for detections', () => {
    const sceneIds = new Set(IMAGERY_SCENES.map((s) => s.id));
    for (const e of IMAGERY_PANEL) expect(e.opacity).toBe(sceneIds.has(e.key));
  });

  it('marks overlays as children and captures as parents', () => {
    const sceneIds = new Set(IMAGERY_SCENES.map((s) => s.id));
    for (const e of IMAGERY_PANEL) expect(e.child).toBe(!sceneIds.has(e.key));
  });

  it('never leaves a child without a parent directly above it', () => {
    IMAGERY_PANEL.forEach((e, i) => {
      if (!e.child) return;
      expect(i).toBeGreaterThan(0);
      expect(IMAGERY_PANEL[i - 1].child).toBe(false);
    });
  });

  it('gives every entry a focus target', () => {
    for (const e of IMAGERY_PANEL) {
      expect(Number.isFinite(e.focus.lng)).toBe(true);
      expect(Number.isFinite(e.focus.lat)).toBe(true);
      expect(e.focus.zoom).toBeGreaterThan(0);
    }
  });
});
