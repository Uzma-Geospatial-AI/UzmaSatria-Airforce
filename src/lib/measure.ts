/**
 * Geodesic measurement primitives for the map toolbox.
 *
 * Everything here works on a sphere of the WGS-84 mean radius. That is good to
 * roughly 0.3% against the true ellipsoid — well inside what an operator reads
 * off a screen — and it keeps the maths cheap enough to run on every mouse
 * move while a measurement is being dragged out.
 */

/** WGS-84 mean radius, metres. */
export const EARTH_RADIUS_M = 6371008.8;

const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export type LngLat = [number, number];

export type MeasureKind = 'distance' | 'area' | 'radius' | 'bearing';

export type MeasureUnit = 'metric' | 'nautical' | 'imperial';

export interface Measurement {
  id: string;
  kind: MeasureKind;
  /** Vertices in [lng, lat] order. Never closed — the ring is implied for area. */
  points: LngLat[];
  color: string;
  label: string;
  createdAt: number;
}

/** Each tool's colour, shared so the panel and the map agree on the ink. */
export const MEASURE_COLORS: Record<MeasureKind, string> = {
  distance: '#00E5FF',
  area: '#00E676',
  radius: '#FFD700',
  bearing: '#E040FB',
};

/** How many map clicks a tool needs before it commits on its own. */
export const FIXED_POINT_TOOLS: Partial<Record<MeasureKind, number>> = {
  radius: 2,
  bearing: 2,
};

/** Fewest vertices a tool needs before its result means anything. */
export const MIN_POINTS: Record<MeasureKind, number> = {
  distance: 2,
  area: 3,
  radius: 2,
  bearing: 2,
};

/** Great-circle distance between two points, in metres. */
export function haversineM(a: LngLat, b: LngLat): number {
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const dLat = lat2 - lat1;
  const dLng = rad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Summed great-circle length of an open path, in metres. */
export function pathLengthM(points: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i]);
  return total;
}

/**
 * Initial great-circle bearing from `a` to `b`, in degrees true (0-360).
 * This is the heading you would fly leaving `a`; on a long leg it drifts, which
 * is why the panel also reports the reciprocal measured back at the far end.
 */
export function bearingDeg(a: LngLat, b: LngLat): number {
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const dLng = rad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** The point you reach travelling `distanceM` from `origin` on `bearing`. */
export function destination(origin: LngLat, distanceM: number, bearing: number): LngLat {
  const d = distanceM / EARTH_RADIUS_M;
  const b = rad(bearing);
  const lat1 = rad(origin[1]);
  const lng1 = rad(origin[0]);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [((deg(lng2) + 540) % 360) - 180, deg(lat2)];
}

/** Repeats the first vertex at the end unless the ring is already closed. */
export function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

/**
 * Spherical-excess area of a closed ring, in square metres.
 *
 * The ring may be given open — the wrap-around is handled here — and winding
 * order does not matter, since the sign is discarded.
 */
export function ringAreaM2(ring: LngLat[]): number {
  const coords = closeRing(ring);
  if (coords.length < 4) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lower = coords[i === 0 ? coords.length - 2 : i - 1];
    const middle = coords[i];
    const upper = coords[i + 1];
    total += (rad(upper[0]) - rad(lower[0])) * Math.sin(rad(middle[1]));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

/** A geodesic circle approximated as a polygon ring, for range rings. */
export function circleRing(center: LngLat, radiusM: number, steps = 128): LngLat[] {
  const ring: LngLat[] = [];
  for (let i = 0; i < steps; i++) ring.push(destination(center, radiusM, (i * 360) / steps));
  ring.push(ring[0]);
  return ring;
}

/** Midpoint of a segment, used to hang the per-leg label off the line. */
export function midpoint(a: LngLat, b: LngLat): LngLat {
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const dLng = rad(b[0] - a[0]);
  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) ** 2 + by ** 2),
  );
  const lng3 = rad(a[0]) + Math.atan2(by, Math.cos(lat1) + bx);
  return [((deg(lng3) + 540) % 360) - 180, deg(lat3)];
}

/** Average of a ring's vertices — good enough to place an area label. */
export function centroid(points: LngLat[]): LngLat {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

const M_PER_NM = 1852;
const M_PER_MI = 1609.344;
const M_PER_FT = 0.3048;

function trim(value: number): string {
  if (value >= 1000) return value.toFixed(0);
  if (value >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

/** Distance rendered in the operator's chosen unit, with a small-scale fallback. */
export function formatDistance(meters: number, unit: MeasureUnit): string {
  if (!Number.isFinite(meters)) return '—';
  if (unit === 'nautical') {
    if (meters < M_PER_NM / 10) return `${(meters / M_PER_FT).toFixed(0)} ft`;
    return `${trim(meters / M_PER_NM)} NM`;
  }
  if (unit === 'imperial') {
    if (meters < M_PER_MI / 10) return `${(meters / M_PER_FT).toFixed(0)} ft`;
    return `${trim(meters / M_PER_MI)} mi`;
  }
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${trim(meters / 1000)} km`;
}

/** Area rendered in the squared form of the chosen unit. */
export function formatArea(m2: number, unit: MeasureUnit): string {
  if (!Number.isFinite(m2)) return '—';
  if (unit === 'nautical') return `${trim(m2 / (M_PER_NM * M_PER_NM))} NM²`;
  if (unit === 'imperial') return `${trim(m2 / (M_PER_MI * M_PER_MI))} mi²`;
  if (m2 < 1e6) return `${m2.toFixed(0)} m²`;
  return `${trim(m2 / 1e6)} km²`;
}

/** Three-digit true bearing, the way it is read off a compass rose. */
export function formatBearing(bearing: number): string {
  const normalised = ((bearing % 360) + 360) % 360;
  return `${normalised.toFixed(0).padStart(3, '0')}°`;
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** Sixteen-point compass name for a bearing, e.g. 47 degrees -> NE. */
export function compassPoint(bearing: number): string {
  const normalised = ((bearing % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalised / 22.5) % 16];
}

/** Signed decimal degrees written as degrees-minutes-seconds with a hemisphere. */
export function formatDms(value: number, axis: 'lat' | 'lng'): string {
  const hemisphere = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  const width = axis === 'lat' ? 2 : 3;
  return `${String(d).padStart(width, '0')}°${String(m).padStart(2, '0')}'${s.toFixed(1).padStart(4, '0')}"${hemisphere}`;
}

export interface MeasureStats {
  /** Total path length, or circumference for a radius ring. */
  distanceM?: number;
  areaM2?: number;
  perimeterM?: number;
  /** Initial bearing on the first leg. */
  bearingDeg?: number;
  /** Bearing read back from the far end — the reciprocal you fly home on. */
  reverseBearingDeg?: number;
  radiusM?: number;
}

/** Everything the panel needs to describe a measurement, derived from its points. */
export function measureStats(kind: MeasureKind, points: LngLat[]): MeasureStats {
  if (kind === 'area') {
    if (points.length < 3) return {};
    return {
      areaM2: ringAreaM2(points),
      perimeterM: pathLengthM(closeRing(points)),
    };
  }

  if (points.length < 2) return {};

  if (kind === 'distance') {
    return { distanceM: pathLengthM(points) };
  }

  if (kind === 'bearing') {
    const a = points[0];
    const b = points[points.length - 1];
    return {
      distanceM: haversineM(a, b),
      bearingDeg: bearingDeg(a, b),
      reverseBearingDeg: bearingDeg(b, a),
    };
  }

  const radiusM = haversineM(points[0], points[1]);
  return {
    radiusM,
    areaM2: Math.PI * radiusM * radiusM,
    perimeterM: 2 * Math.PI * radiusM,
    bearingDeg: bearingDeg(points[0], points[1]),
  };
}

/** One-line summary shown on the map label and in the measurement list. */
export function summarise(kind: MeasureKind, points: LngLat[], unit: MeasureUnit): string {
  const s = measureStats(kind, points);
  if (kind === 'distance') return formatDistance(s.distanceM ?? 0, unit);
  if (kind === 'bearing')
    return `${formatBearing(s.bearingDeg ?? 0)} · ${formatDistance(s.distanceM ?? 0, unit)}`;
  if (kind === 'radius') return `R ${formatDistance(s.radiusM ?? 0, unit)}`;
  return formatArea(s.areaM2 ?? 0, unit);
}

/** The drawn geometry for a measurement — a ring for area/radius, a line otherwise. */
export function measureGeometry(kind: MeasureKind, points: LngLat[]): GeoJSON.Geometry | null {
  if (kind === 'radius') {
    if (points.length < 2) return null;
    return {
      type: 'Polygon',
      coordinates: [circleRing(points[0], haversineM(points[0], points[1]))],
    };
  }
  if (kind === 'area') {
    if (points.length < 3) {
      return points.length > 1 ? { type: 'LineString', coordinates: points } : null;
    }
    return { type: 'Polygon', coordinates: [closeRing(points)] };
  }
  if (points.length < 2) return null;
  return { type: 'LineString', coordinates: points };
}

/** A measurement as a GeoJSON feature, stats flattened into its properties. */
export function measureFeature(m: Measurement, unit: MeasureUnit): GeoJSON.Feature | null {
  const geometry = measureGeometry(m.kind, m.points);
  if (!geometry) return null;
  const stats = measureStats(m.kind, m.points);
  return {
    type: 'Feature',
    geometry,
    properties: {
      id: m.id,
      kind: m.kind,
      label: m.label,
      color: m.color,
      summary: summarise(m.kind, m.points, unit),
      createdAt: new Date(m.createdAt).toISOString(),
      distance_m: stats.distanceM !== undefined ? Math.round(stats.distanceM) : undefined,
      area_m2: stats.areaM2 !== undefined ? Math.round(stats.areaM2) : undefined,
      perimeter_m: stats.perimeterM !== undefined ? Math.round(stats.perimeterM) : undefined,
      radius_m: stats.radiusM !== undefined ? Math.round(stats.radiusM) : undefined,
      bearing_deg: stats.bearingDeg !== undefined ? Number(stats.bearingDeg.toFixed(2)) : undefined,
    },
  };
}

/** Every measurement bundled for export or hand-off to another tool. */
export function measureCollection(
  measurements: Measurement[],
  unit: MeasureUnit,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: measurements
      .map((m) => measureFeature(m, unit))
      .filter((f): f is GeoJSON.Feature => f !== null),
  };
}
