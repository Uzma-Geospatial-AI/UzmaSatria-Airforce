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
 * the map sources and the focus buttons are all built from this array.
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
  /**
   * Read the archive through /api/pmtiles instead of straight from its host.
   * Set this when the bucket serves no `Access-Control-Allow-Origin`, which a
   * browser treats as a refusal however public the object is. Check with:
   *   curl -sI -H 'Origin: http://localhost:3000' <url> | grep -i access-control
   */
  proxy?: boolean;
}

/** The URL the map should actually open, proxied if the host lacks CORS. */
export function sceneUrl(s: ImageryScene): string {
  return s.proxy ? `/api/pmtiles?url=${encodeURIComponent(s.url)}` : s.url;
}

export const IMAGERY_SCENES: ImageryScene[] = [
  {
    id: 'imagery_20260719',
    label: '19 Jul 2026',
    date: '2026-07-19',
    site: 'Paya Lebar, Singapore',
    url: 'https://digitalearthbasemap.s3.ap-southeast-1.amazonaws.com/payalebar.pmtiles',
    // Straight from the PMTiles header, not estimated.
    bounds: [103.849, 1.30254, 103.9389999, 1.39306],
    minzoom: 10,
    maxzoom: 19,
    // The bucket serves the bytes but sets no CORS headers, so the browser
    // cannot read it directly. Routed through /api/pmtiles until that is fixed
    // on the bucket, which is where it belongs.
    proxy: true,
  },
  {
    id: 'imagery_20260512',
    label: '12 May 2026',
    date: '2026-05-12',
    site: 'Halim Perdanakusuma, Jakarta',
    url: 'https://digitalearthbasemap.s3.ap-southeast-1.amazonaws.com/halim.pmtiles',
    // Straight from the PMTiles header, not estimated. Note the shallower
    // max zoom than the Paya Lebar capture — this archive stops at 18.
    bounds: [106.844, -6.31151, 106.953, -6.22068],
    minzoom: 10,
    maxzoom: 18,
    // Same bucket as Paya Lebar, same missing CORS headers.
    proxy: true,
  },
];

/** Newest last, so later scenes are added above earlier ones on the map. */
export const SCENES_BY_DATE = [...IMAGERY_SCENES].sort((a, b) => a.date.localeCompare(b.date));

/** Centre of a scene's footprint — where the camera should land. */
export function sceneCenter(s: ImageryScene): { lng: number; lat: number } {
  const [w, so, e, n] = s.bounds;
  return { lng: (w + e) / 2, lat: (so + n) / 2 };
}
