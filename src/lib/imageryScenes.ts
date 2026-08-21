/**
 * OSIRIS — Satellite imagery scenes (imagery tasking).
 *
 * Each entry is one tasked capture: a PMTiles archive holding pre-rendered
 * raster tiles for a single AOI at a single date. Toggling a scene on drapes
 * it over the basemap; two captures of the same AOI stack newest-on-top so
 * you can flip between them to see what changed.
 *
 * ── Adding a scene ──
 * Append to IMAGERY_SCENES. Nothing else needs editing: the layer panel group,
 * the map sources, the footprint outlines and the focus buttons are all built
 * from this array.
 *
 * `bounds`, `minzoom` and `maxzoom` come from the PMTiles header rather than
 * being guessed — read them with:
 *   npx pmtiles show <url>
 * Getting them wrong is not cosmetic: MapLibre will request tiles outside the
 * archive and log 404s for every pan.
 */

export interface ImageryScene {
  /** Layer key. Must be unique; used as the activeLayers key and source id. */
  id: string;
  /** Shown in the layer panel. Keep it short — the flyout is 220px wide. */
  label: string;
  /** Capture date, ISO. Drives stacking order (newest renders on top). */
  date: string;
  /** Site name, shown in the scene's tooltip. */
  site: string;
  /** PMTiles archive URL. Must be CORS-enabled and support range requests. */
  url: string;
  /** [west, south, east, north] from the PMTiles header. */
  bounds: [number, number, number, number];
  minzoom: number;
  maxzoom: number;
}

export const IMAGERY_SCENES: ImageryScene[] = [
  {
    id: 'imagery_20250429',
    label: '29 Apr 2025',
    date: '2025-04-29',
    site: 'Kuantan, Pahang',
    url: 'https://aeye-checker.s3.ap-southeast-1.amazonaws.com/hackathon/20250429_VISUAL.pmtiles',
    bounds: [103.29914622, 3.72572334, 103.31878536, 3.82478183],
    minzoom: 11,
    maxzoom: 18,
  },
  {
    id: 'imagery_20251222',
    label: '22 Dec 2025',
    date: '2025-12-22',
    site: 'Kuantan, Pahang',
    url: 'https://aeye-checker.s3.ap-southeast-1.amazonaws.com/hackathon/20251222_VISUAL.pmtiles',
    bounds: [103.29914622, 3.72572335, 103.31877999, 3.82478183],
    minzoom: 11,
    maxzoom: 18,
  },
];

/** Newest last, so later scenes are added above earlier ones on the map. */
export const SCENES_BY_DATE = [...IMAGERY_SCENES].sort((a, b) => a.date.localeCompare(b.date));

/** Centre of a scene's footprint — where the camera should land. */
export function sceneCenter(s: ImageryScene): { lng: number; lat: number } {
  const [w, so, e, n] = s.bounds;
  return { lng: (w + e) / 2, lat: (so + n) / 2 };
}

/** Footprint as a GeoJSON polygon, drawn so the AOI is findable when zoomed out. */
export function sceneFootprint(s: ImageryScene): GeoJSON.Feature<GeoJSON.Polygon> {
  const [w, so, e, n] = s.bounds;
  return {
    type: 'Feature',
    properties: { id: s.id, label: s.label, site: s.site },
    geometry: {
      type: 'Polygon',
      coordinates: [[[w, so], [e, so], [e, n], [w, n], [w, so]]],
    },
  };
}
