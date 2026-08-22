/**
 * OSIRIS — Satellite imagery scenes (imagery tasking).
 *
 * Each entry is one tasked capture: a PMTiles archive holding pre-rendered
 * raster tiles for a single AOI at a single date. Toggling a scene on drapes
 * it over the basemap; two captures of the same AOI stack newest-on-top so
 * you can flip between them to see what changed.
 *
 * Alongside the captures sit vector overlays derived from them — detections
 * read off a scene, drawn over it as polygons.
 *
 * ── Adding a scene or overlay ──
 * Append to IMAGERY_SCENES or IMAGERY_OVERLAYS. Nothing else needs editing:
 * the layer panel group, the map sources and the focus buttons are all built
 * from IMAGERY_PANEL, which orders each overlay directly under the capture it
 * came off.
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

/**
 * A vector layer read off one of the captures above — object detections drawn
 * as polygons over the imagery that produced them.
 */
export interface ImageryOverlay {
  /** Layer key. Must be unique; used as the activeLayers key and source id. */
  id: string;
  /** Shown in the layer panel. */
  label: string;
  /** Second line under the label. */
  site: string;
  /** GeoJSON URL. Must be CORS-enabled — this is fetched by the browser. */
  url: string;
  /** id of the ImageryScene this was derived from; it lists under that scene. */
  scene: string;
  /** Feature property to colour and group by. */
  classifyBy: string;
  /** Feature property to write beside each shape. */
  labelBy: string;
  /** Colour per distinct `classifyBy` value. */
  palette: Record<string, string>;
  /** Colour for a class the palette does not name. */
  fallbackColor: string;
  /** Camera target for the focus button. */
  center: { lng: number; lat: number };
  focusZoom: number;
}

export const IMAGERY_OVERLAYS: ImageryOverlay[] = [
  {
    id: 'imagery_20260719_aircraft',
    label: 'Aircraft Detections',
    site: '15 objects · Paya Lebar',
    url: 'https://digitalearthgeojson.s3.ap-southeast-5.amazonaws.com/tudm/aircraft_payalebar.geojson',
    scene: 'imagery_20260719',
    classifyBy: 'class',
    labelBy: 'identify',
    /* Military types read hot, civil reads cool, so a hostile-relevant
       airframe is separable from an airliner at a glance. */
    palette: {
      'Transport': '#FF9500',
      'Maritime Patrol': '#FF3D3D',
      'Commercial Airliner': '#00E5FF',
    },
    fallbackColor: '#B0BEC5',
    // Centre of the detection extent, not of the parent capture.
    center: { lng: 103.90059, lat: 1.35479 },
    focusZoom: 15,
  },
];

/** Every overlay derived from a given capture. */
export function overlaysForScene(sceneId: string): ImageryOverlay[] {
  return IMAGERY_OVERLAYS.filter((o) => o.scene === sceneId);
}

export interface ImageryPanelEntry {
  key: string;
  label: string;
  sub: string;
  focus: { lng: number; lat: number; zoom: number };
  /** Raster captures get an opacity slider; vector overlays do not need one. */
  opacity: boolean;
  /**
   * True for a layer derived from the one above it. The panel indents these
   * under their parent, so a detection layer reads as belonging to the capture
   * it was read off rather than as a sibling of it.
   */
  child: boolean;
}

/**
 * The imagery group as the panel shows it: each capture, then the overlays
 * read off it, so a detection layer sits under the picture it came from.
 */
export const IMAGERY_PANEL: ImageryPanelEntry[] = IMAGERY_SCENES.flatMap((scene) => [
  {
    key: scene.id,
    label: scene.label,
    sub: scene.site,
    focus: { ...sceneCenter(scene), zoom: 13 },
    opacity: true,
    child: false,
  },
  ...overlaysForScene(scene.id).map((o) => ({
    key: o.id,
    label: o.label,
    sub: o.site,
    focus: { ...o.center, zoom: o.focusZoom },
    opacity: false,
    child: true,
  })),
]);

/** Newest last, so later scenes are added above earlier ones on the map. */
export const SCENES_BY_DATE = [...IMAGERY_SCENES].sort((a, b) => a.date.localeCompare(b.date));

/** Centre of a scene's footprint — where the camera should land. */
export function sceneCenter(s: ImageryScene): { lng: number; lat: number } {
  const [w, so, e, n] = s.bounds;
  return { lng: (w + e) / 2, lat: (so + n) / 2 };
}
