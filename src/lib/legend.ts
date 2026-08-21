/**
 * What every symbol on the map means.
 *
 * The colours here are transcribed from the paint expressions in
 * OsirisMap.tsx — this file is a reading of the map, not a second source of
 * truth for it. Change a layer's palette there and the matching entry here has
 * to follow, or the legend starts lying.
 */

export type SwatchShape =
  /** Filled circle — the default point symbol. */
  | 'dot'
  /** Hollow circle, for symbols that read as an outline on the map. */
  | 'ring'
  /** Solid stroke. */
  | 'line'
  /** Dashed stroke. */
  | 'dashed'
  /** Warning triangle, as used for conflict icons. */
  | 'triangle'
  /** Aircraft glyph. */
  | 'plane'
  /** Translucent area wash. */
  | 'fill'
  /** A graduated ramp between `color` and `toColor`. */
  | 'ramp';

export interface LegendItem {
  color: string;
  label: string;
  shape?: SwatchShape;
  /** End of the ramp, for `shape: 'ramp'`. */
  toColor?: string;
  /** Recoloured to a single hue by the ghost theme, as the map does. */
  themable?: boolean;
}

export interface LegendSection {
  id: string;
  title: string;
  items: LegendItem[];
  /** Mirrors the map's own visibility test for this section's layers. */
  visible: (layers: Record<string, boolean | undefined>) => boolean;
  /** Extra line explaining what size or motion encodes. */
  note?: string;
}

/** The ghost theme flattens themable symbols to one hue. */
export const PHANTOM_PURPLE = '#B388FF';

/* Every layer is opt-in: a key that is absent or false means the map is not
   drawing it, so the legend must not claim it is. The sdk_* and conflict_zones
   sections used to test `!== false`, which made a missing key read as on. */
const on = (key: string) => (layers: Record<string, boolean | undefined>) => Boolean(layers[key]);

export const LEGEND_SECTIONS: LegendSection[] = [
  {
    id: 'flights',
    title: 'COMMERCIAL AIR',
    visible: on('flights'),
    items: [{ color: '#00E5FF', label: 'Commercial flight', shape: 'plane', themable: true }],
    note: 'Glyph points along the reported heading.',
  },
  {
    id: 'private',
    title: 'PRIVATE AIR',
    visible: on('private'),
    items: [{ color: '#FFD700', label: 'Private aircraft', shape: 'plane', themable: true }],
  },
  {
    id: 'jets',
    title: 'PRIVATE JETS',
    visible: on('jets'),
    items: [{ color: '#FF9500', label: 'Private jet', shape: 'plane', themable: true }],
  },
  {
    id: 'military',
    title: 'MILITARY AIR',
    visible: on('military'),
    items: [{ color: '#FF3D3D', label: 'Military aircraft', shape: 'plane', themable: true }],
  },
  {
    id: 'maritime',
    title: 'MARITIME',
    visible: on('maritime'),
    items: [
      { color: '#D32F2F', label: 'Naval base / warship' },
      { color: '#E65100', label: 'Energy terminal / tanker' },
      { color: '#26C6DA', label: 'Commercial port / cargo' },
      { color: '#B0BEC5', label: 'Other vessel' },
      { color: '#D32F2F', label: 'Chokepoint — critical', shape: 'ring' },
      { color: '#E65100', label: 'Chokepoint — high', shape: 'ring' },
      { color: '#F9A825', label: 'Chokepoint — elevated', shape: 'ring' },
      { color: '#26A69A', label: 'Chokepoint — nominal', shape: 'ring' },
    ],
  },
  {
    id: 'satellites',
    title: 'SATELLITES — ALL',
    visible: on('satellites'),
    items: [
      { color: '#FF3D3D', label: 'Military recon / NRO' },
      { color: '#FFFFFF', label: 'SIGINT' },
      { color: '#FF00FF', label: 'Early warning' },
      { color: '#FF6B6B', label: 'Russian / Chinese recon' },
      { color: '#448AFF', label: 'GNSS navigation' },
      { color: '#00E676', label: 'Commercial comms & imaging' },
      { color: '#87CEEB', label: 'Weather' },
      { color: '#90EE90', label: 'Earth observation' },
      { color: '#FFD700', label: 'Station / telescope' },
      { color: '#00E5FF', label: 'Unclassified' },
    ],
    note: 'Position is the sub-satellite point, propagated from TLE.',
  },
  {
    id: 'sat_comms',
    title: 'SATELLITES — COMMS',
    visible: on('sat_comms'),
    items: [{ color: '#00E676', label: 'Commercial comms & imaging' }],
  },
  {
    id: 'sat_military',
    title: 'SATELLITES — MILITARY',
    visible: on('sat_military'),
    items: [
      { color: '#FF3D3D', label: 'Military recon / NRO' },
      { color: '#FFFFFF', label: 'SIGINT' },
      { color: '#FF00FF', label: 'Early warning' },
      { color: '#FF6B6B', label: 'Russian / Chinese recon' },
      { color: '#00E5FF', label: 'SAR imaging' },
    ],
  },
  {
    id: 'sat_navigation',
    title: 'SATELLITES — NAVIGATION',
    visible: on('sat_navigation'),
    items: [{ color: '#448AFF', label: 'GPS / GLONASS / Galileo / BeiDou' }],
  },
  {
    id: 'sat_earth',
    title: 'SATELLITES — EARTH OBS',
    visible: on('sat_earth'),
    items: [
      { color: '#87CEEB', label: 'Weather' },
      { color: '#90EE90', label: 'Earth observation / science' },
    ],
  },
  {
    id: 'sat_science',
    title: 'SATELLITES — SCIENCE',
    visible: on('sat_science'),
    items: [{ color: '#FFD700', label: 'Station / telescope' }],
  },
  {
    id: 'balloons',
    title: 'BALLOONS',
    visible: on('balloons'),
    items: [{ color: '#D4AF37', label: 'High-altitude balloon' }],
  },
  {
    id: 'cctv',
    title: 'SURVEILLANCE',
    visible: on('cctv'),
    items: [{ color: '#00E676', label: 'Public CCTV camera', themable: true }],
    note: 'Labels appear from zoom 10.',
  },
  {
    id: 'live_news',
    title: 'LIVE NEWS',
    visible: on('live_news'),
    items: [{ color: '#EC407A', label: 'Live news feed' }],
  },
  {
    id: 'earthquakes',
    title: 'EARTHQUAKES',
    visible: on('earthquakes'),
    items: [
      { color: '#F9A825', toColor: '#D32F2F', label: 'M2.5 → M6+', shape: 'ramp' },
    ],
    note: 'Radius grows with magnitude. Labelled from M4.5.',
  },
  {
    id: 'fires',
    title: 'ACTIVE FIRES',
    visible: on('fires'),
    items: [{ color: '#E65100', label: 'Thermal anomaly' }],
  },
  {
    id: 'weather',
    title: 'SEVERE WEATHER',
    visible: on('weather'),
    items: [
      { color: '#7E57C2', label: 'Cyclone / storm' },
      { color: '#D32F2F', label: 'Volcano' },
    ],
  },
  {
    id: 'radiation',
    title: 'RADIATION',
    visible: on('radiation'),
    items: [
      { color: '#D32F2F', label: 'Danger' },
      { color: '#E65100', label: 'Warning' },
      { color: '#7E57C2', label: 'Nominal' },
    ],
  },
  {
    id: 'infrastructure',
    title: 'NUCLEAR FACILITIES',
    visible: on('infrastructure'),
    items: [
      { color: '#26A69A', label: 'Operational' },
      { color: '#E65100', label: 'Seismic risk' },
    ],
  },
  {
    id: 'global_incidents',
    title: 'GLOBAL INCIDENTS',
    visible: on('global_incidents'),
    items: [{ color: '#D32F2F', label: 'Reported incident' }],
  },
  {
    id: 'gdelt_events',
    title: 'GDELT EVENTS',
    visible: on('gdelt_events'),
    items: [
      { color: '#00E676', label: 'Verbal cooperation' },
      { color: '#00E5FF', label: 'Material cooperation' },
      { color: '#FF9500', label: 'Verbal conflict' },
      { color: '#FF3D3D', label: 'Material conflict' },
      { color: '#9B978E', label: 'Unclassified' },
    ],
    note: 'Radius grows with the number of sourcing articles.',
  },
  {
    id: 'conflict_zones',
    title: 'CONFLICT ZONES',
    visible: on('conflict_zones'),
    items: [
      { color: '#D32F2F', label: 'War', shape: 'triangle' },
      { color: '#E65100', label: 'High intensity', shape: 'triangle' },
      { color: '#F9A825', label: 'Elevated', shape: 'triangle' },
    ],
  },
  {
    id: 'malware',
    title: 'LIVE MALWARE',
    visible: on('malware'),
    items: [
      { color: '#D32F2F', label: 'Malware C2 node' },
      { color: '#546E7A', label: 'Network mesh link', shape: 'line' },
    ],
  },
  {
    id: 'cyber_attacks',
    title: 'LIVE ATTACKS',
    visible: on('cyber_attacks'),
    items: [
      { color: '#333333', label: 'Attack arc', shape: 'line' },
      { color: '#111111', label: 'Attack head' },
    ],
    note: 'Arcs are drawn dark so they read against a lit basemap.',
  },
  {
    id: 'cf_outages',
    title: 'INTERNET OUTAGES',
    visible: on('cf_outages'),
    items: [
      { color: '#FFB300', label: 'Ongoing outage' },
      { color: '#8B7325', label: 'Resolved outage' },
    ],
  },
  {
    id: 'cf_attacks',
    title: 'ATTACK ORIGINS',
    visible: on('cf_attacks'),
    items: [{ color: '#FF3D3D', label: 'Attack origin country' }],
    note: 'Radius grows with share of observed traffic.',
  },
  {
    id: 'sdk_sea',
    title: 'SUBMARINE CABLES',
    visible: on('sdk_sea'),
    items: [{ color: '#1976D2', label: 'Submarine cable', shape: 'line' }],
  },
  {
    id: 'sdk_air',
    title: 'SDK — AIR',
    visible: on('sdk_air'),
    items: [{ color: '#4DD0E1', label: 'Air domain link', shape: 'line' }],
  },
  {
    id: 'sdk_naval',
    title: 'SDK — INTEL',
    visible: on('sdk_naval'),
    items: [{ color: '#7986CB', label: 'Intel domain link', shape: 'line' }],
  },
  {
    id: 'day_night',
    title: 'DAY / NIGHT',
    visible: on('day_night'),
    items: [{ color: '#000022', label: 'Night side of the terminator', shape: 'fill' }],
  },
];

/**
 * Sections whose layers are currently drawn, with ghost-theme recolouring
 * already applied so the swatch matches what is actually on screen.
 */
export function activeLegend(
  layers: Record<string, boolean | undefined>,
  theme: 'core' | 'ghost' = 'core',
): LegendSection[] {
  const visible = LEGEND_SECTIONS.filter((section) => section.visible(layers));
  if (theme !== 'ghost') return visible;
  return visible.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.themable ? { ...item, color: PHANTOM_PURPLE } : item,
    ),
  }));
}

/** Total swatches on show — used to decide whether the legend is worth opening. */
export function legendItemCount(sections: LegendSection[]): number {
  return sections.reduce((sum, s) => sum + s.items.length, 0);
}
