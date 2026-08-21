import { describe, it, expect } from 'vitest';
import {
  haversineM,
  pathLengthM,
  bearingDeg,
  destination,
  ringAreaM2,
  circleRing,
  closeRing,
  midpoint,
  formatDistance,
  formatArea,
  formatBearing,
  compassPoint,
  formatDms,
  measureStats,
  measureGeometry,
  measureCollection,
  summarise,
  type LngLat,
  type Measurement,
} from './measure';

const KUL: LngLat = [101.7099, 3.1478]; // Kuala Lumpur
const SIN: LngLat = [103.8198, 1.3521]; // Singapore
const LHR: LngLat = [-0.4543, 51.4700]; // London Heathrow

describe('haversineM', () => {
  it('is zero for a point measured against itself', () => {
    expect(haversineM(KUL, KUL)).toBe(0);
  });

  it('matches the KUL-SIN city-centre great-circle distance', () => {
    // ~308 km between the two city centres; allow 1% for the sphere.
    expect(haversineM(KUL, SIN)).toBeGreaterThan(305_000);
    expect(haversineM(KUL, SIN)).toBeLessThan(311_000);
  });

  it('handles an intercontinental leg', () => {
    // KUL-LHR is ~10,570 km.
    const d = haversineM(KUL, LHR) / 1000;
    expect(d).toBeGreaterThan(10_400);
    expect(d).toBeLessThan(10_750);
  });

  it('is symmetric', () => {
    expect(haversineM(KUL, LHR)).toBeCloseTo(haversineM(LHR, KUL), 6);
  });

  it('does not blow up on antipodal points', () => {
    const d = haversineM([0, 0], [180, 0]) / 1000;
    expect(d).toBeGreaterThan(20_000);
    expect(Number.isFinite(d)).toBe(true);
  });

  it('measures one degree of latitude at about 111 km', () => {
    expect(haversineM([0, 0], [0, 1]) / 1000).toBeCloseTo(111.2, 0);
  });
});

describe('pathLengthM', () => {
  it('is zero for a path with fewer than two points', () => {
    expect(pathLengthM([])).toBe(0);
    expect(pathLengthM([KUL])).toBe(0);
  });

  it('sums its legs', () => {
    const total = pathLengthM([KUL, SIN, LHR]);
    expect(total).toBeCloseTo(haversineM(KUL, SIN) + haversineM(SIN, LHR), 6);
  });
});

describe('bearingDeg', () => {
  it('reads due north as 0 and due east as 90', () => {
    expect(bearingDeg([0, 0], [0, 10])).toBeCloseTo(0, 6);
    expect(bearingDeg([0, 0], [10, 0])).toBeCloseTo(90, 6);
    expect(bearingDeg([0, 0], [0, -10])).toBeCloseTo(180, 6);
    expect(bearingDeg([0, 0], [-10, 0])).toBeCloseTo(270, 6);
  });

  it('always returns a value inside 0-360', () => {
    for (const b of [
      bearingDeg(KUL, SIN),
      bearingDeg(SIN, KUL),
      bearingDeg(LHR, KUL),
      bearingDeg([179, 10], [-179, 10]),
    ]) {
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
    }
  });

  it('puts Singapore to the south-south-east of Kuala Lumpur', () => {
    const b = bearingDeg(KUL, SIN);
    expect(b).toBeGreaterThan(130);
    expect(b).toBeLessThan(160);
  });

  it('crosses the antimeridian eastward rather than the long way round', () => {
    expect(bearingDeg([179, 0], [-179, 0])).toBeCloseTo(90, 3);
  });
});

describe('destination', () => {
  it('lands the given distance away on the given bearing', () => {
    const target = destination(KUL, 100_000, 45);
    expect(haversineM(KUL, target)).toBeCloseTo(100_000, 0);
    expect(bearingDeg(KUL, target)).toBeCloseTo(45, 3);
  });

  it('returns to the origin after a zero-length hop', () => {
    const same = destination(KUL, 0, 123);
    expect(same[0]).toBeCloseTo(KUL[0], 9);
    expect(same[1]).toBeCloseTo(KUL[1], 9);
  });

  it('normalises longitude across the antimeridian', () => {
    const target = destination([179.5, 0], 200_000, 90);
    expect(target[0]).toBeGreaterThanOrEqual(-180);
    expect(target[0]).toBeLessThanOrEqual(180);
    expect(target[0]).toBeLessThan(0); // wrapped past the antimeridian
  });
});

describe('closeRing', () => {
  it('appends the first vertex when the ring is open', () => {
    const ring = closeRing([[0, 0], [1, 0], [1, 1]]);
    expect(ring).toHaveLength(4);
    expect(ring[3]).toEqual([0, 0]);
  });

  it('leaves an already-closed ring alone', () => {
    const input: LngLat[] = [[0, 0], [1, 0], [1, 1], [0, 0]];
    expect(closeRing(input)).toHaveLength(4);
  });

  it('tolerates an empty ring', () => {
    expect(closeRing([])).toEqual([]);
  });
});

describe('ringAreaM2', () => {
  it('is zero for a degenerate ring', () => {
    expect(ringAreaM2([])).toBe(0);
    expect(ringAreaM2([[0, 0], [1, 1]])).toBe(0);
  });

  it('measures a one-degree box at the equator at about 12,300 km2', () => {
    const km2 = ringAreaM2([[0, 0], [1, 0], [1, 1], [0, 1]]) / 1e6;
    expect(km2).toBeGreaterThan(12_000);
    expect(km2).toBeLessThan(12_500);
  });

  it('gives the same answer regardless of winding order', () => {
    const cw: LngLat[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const ccw = [...cw].reverse();
    expect(ringAreaM2(ccw)).toBeCloseTo(ringAreaM2(cw), 3);
  });

  it('shrinks the same box as it moves toward the pole', () => {
    const equator = ringAreaM2([[0, 0], [1, 0], [1, 1], [0, 1]]);
    const high = ringAreaM2([[0, 60], [1, 60], [1, 61], [0, 61]]);
    expect(high).toBeLessThan(equator);
  });
});

describe('circleRing', () => {
  it('closes on itself', () => {
    const ring = circleRing(KUL, 50_000, 32);
    expect(ring).toHaveLength(33);
    expect(ring[0]).toEqual(ring[32]);
  });

  it('keeps every vertex at the requested radius', () => {
    for (const p of circleRing(KUL, 25_000, 16)) {
      expect(haversineM(KUL, p)).toBeCloseTo(25_000, 0);
    }
  });

  it('approximates pi-r-squared once it has enough vertices', () => {
    const area = ringAreaM2(circleRing(KUL, 100_000, 256));
    expect(area / (Math.PI * 100_000 ** 2)).toBeCloseTo(1, 2);
  });
});

describe('midpoint', () => {
  it('sits an equal distance from both ends', () => {
    const m = midpoint(KUL, SIN);
    expect(haversineM(KUL, m)).toBeCloseTo(haversineM(SIN, m), 0);
  });
});

describe('formatDistance', () => {
  it('uses metres below a kilometre and kilometres above it', () => {
    expect(formatDistance(240, 'metric')).toBe('240 m');
    expect(formatDistance(2_800, 'metric')).toBe('2.80 km');
    expect(formatDistance(2_800_000, 'metric')).toBe('2800 km');
  });

  it('converts to nautical miles for the aviation unit', () => {
    expect(formatDistance(1852, 'nautical')).toBe('1.00 NM');
    expect(formatDistance(185_200, 'nautical')).toBe('100.0 NM');
  });

  it('falls back to feet for very short nautical and imperial spans', () => {
    expect(formatDistance(30, 'nautical')).toBe('98 ft');
    expect(formatDistance(30, 'imperial')).toBe('98 ft');
  });

  it('converts to statute miles for the imperial unit', () => {
    expect(formatDistance(1609.344, 'imperial')).toBe('1.00 mi');
  });

  it('refuses to render a non-finite distance', () => {
    expect(formatDistance(NaN, 'metric')).toBe('—');
  });
});

describe('formatArea', () => {
  it('switches from square metres to square kilometres at 1 km2', () => {
    expect(formatArea(900_000, 'metric')).toBe('900000 m²');
    expect(formatArea(2_500_000, 'metric')).toBe('2.50 km²');
  });

  it('uses squared nautical and statute miles', () => {
    expect(formatArea(1852 * 1852, 'nautical')).toBe('1.00 NM²');
    expect(formatArea(1609.344 * 1609.344, 'imperial')).toBe('1.00 mi²');
  });
});

describe('formatBearing', () => {
  it('pads to three digits', () => {
    expect(formatBearing(7)).toBe('007°');
    expect(formatBearing(47)).toBe('047°');
    expect(formatBearing(180)).toBe('180°');
  });

  it('normalises out-of-range input', () => {
    expect(formatBearing(-90)).toBe('270°');
    expect(formatBearing(450)).toBe('090°');
  });
});

describe('compassPoint', () => {
  it('names the cardinal and intercardinal points', () => {
    expect(compassPoint(0)).toBe('N');
    expect(compassPoint(45)).toBe('NE');
    expect(compassPoint(90)).toBe('E');
    expect(compassPoint(180)).toBe('S');
    expect(compassPoint(270)).toBe('W');
  });

  it('wraps 359 back around to north', () => {
    expect(compassPoint(359)).toBe('N');
  });
});

describe('formatDms', () => {
  it('writes latitude with a two-digit degree and a hemisphere', () => {
    expect(formatDms(3.1478, 'lat')).toBe(`03°08'52.1"N`);
  });

  it('writes longitude with a three-digit degree', () => {
    expect(formatDms(101.7099, 'lng')).toBe(`101°42'35.6"E`);
  });

  it('marks southern and western hemispheres', () => {
    expect(formatDms(-1.3521, 'lat')).toContain('S');
    expect(formatDms(-0.4543, 'lng')).toContain('W');
  });
});

describe('measureStats', () => {
  it('returns nothing usable before a tool has enough points', () => {
    expect(measureStats('distance', [KUL])).toEqual({});
    expect(measureStats('area', [KUL, SIN])).toEqual({});
  });

  it('totals a multi-leg distance', () => {
    const s = measureStats('distance', [KUL, SIN, LHR]);
    expect(s.distanceM).toBeCloseTo(pathLengthM([KUL, SIN, LHR]), 6);
  });

  it('reports both the outbound bearing and its reciprocal', () => {
    const s = measureStats('bearing', [KUL, SIN]);
    expect(s.bearingDeg).toBeCloseTo(bearingDeg(KUL, SIN), 6);
    expect(s.reverseBearingDeg).toBeCloseTo(bearingDeg(SIN, KUL), 6);
    expect(s.distanceM).toBeCloseTo(haversineM(KUL, SIN), 6);
  });

  it('derives a range ring from its centre and rim point', () => {
    const rim = destination(KUL, 80_000, 90);
    const s = measureStats('radius', [KUL, rim]);
    expect(s.radiusM).toBeCloseTo(80_000, 0);
    expect(s.areaM2).toBeCloseTo(Math.PI * 80_000 ** 2, 0);
    expect(s.perimeterM).toBeCloseTo(2 * Math.PI * 80_000, 0);
  });

  it('gives an area polygon both its area and its closed perimeter', () => {
    const s = measureStats('area', [[0, 0], [1, 0], [1, 1], [0, 1]]);
    expect(s.areaM2).toBeGreaterThan(0);
    // The perimeter must include the closing leg back to the first vertex.
    expect(s.perimeterM).toBeGreaterThan(pathLengthM([[0, 0], [1, 0], [1, 1], [0, 1]]));
  });
});

describe('summarise', () => {
  it('describes each tool in the operator unit', () => {
    expect(summarise('distance', [[0, 0], [0, 1]], 'metric')).toContain('km');
    expect(summarise('bearing', [[0, 0], [0, 1]], 'nautical')).toContain('000°');
    expect(summarise('radius', [[0, 0], [0, 1]], 'metric')).toMatch(/^R /);
    expect(summarise('area', [[0, 0], [1, 0], [1, 1]], 'metric')).toContain('km²');
  });
});

describe('measureGeometry', () => {
  it('draws a line for a distance measurement', () => {
    expect(measureGeometry('distance', [KUL, SIN])?.type).toBe('LineString');
  });

  it('draws a closed polygon for an area measurement', () => {
    const g = measureGeometry('area', [[0, 0], [1, 0], [1, 1]]) as GeoJSON.Polygon;
    expect(g.type).toBe('Polygon');
    expect(g.coordinates[0]).toHaveLength(4);
    expect(g.coordinates[0][0]).toEqual(g.coordinates[0][3]);
  });

  it('falls back to a line while an area is still only two points in', () => {
    expect(measureGeometry('area', [KUL, SIN])?.type).toBe('LineString');
  });

  it('draws a circle for a range ring', () => {
    const g = measureGeometry('radius', [KUL, SIN]) as GeoJSON.Polygon;
    expect(g.type).toBe('Polygon');
    expect(g.coordinates[0].length).toBeGreaterThan(64);
  });

  it('yields nothing at all from a single point', () => {
    expect(measureGeometry('distance', [KUL])).toBeNull();
    expect(measureGeometry('radius', [KUL])).toBeNull();
    expect(measureGeometry('area', [KUL])).toBeNull();
  });
});

describe('measureCollection', () => {
  const make = (kind: Measurement['kind'], points: LngLat[]): Measurement => ({
    id: `m-${kind}`,
    kind,
    points,
    color: '#00E5FF',
    label: kind.toUpperCase(),
    createdAt: 1_700_000_000_000,
  });

  it('exports one feature per drawable measurement', () => {
    const fc = measureCollection(
      [make('distance', [KUL, SIN]), make('radius', [KUL, SIN])],
      'metric',
    );
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
  });

  it('drops measurements that have no geometry yet', () => {
    const fc = measureCollection([make('distance', [KUL])], 'metric');
    expect(fc.features).toHaveLength(0);
  });

  it('flattens the stats into feature properties', () => {
    const fc = measureCollection([make('bearing', [KUL, SIN])], 'nautical');
    const props = fc.features[0].properties!;
    expect(props.kind).toBe('bearing');
    expect(props.bearing_deg).toBeGreaterThan(0);
    expect(props.distance_m).toBeGreaterThan(0);
    expect(props.summary).toContain('NM');
    expect(props.createdAt).toBe('2023-11-14T22:13:20.000Z');
  });
});
