'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler, Pentagon, CircleDot, Compass, Trash2, Download, Copy, Check,
  Crosshair, X,
} from 'lucide-react';
import {
  measureCollection,
  measureStats,
  summarise,
  formatArea,
  formatBearing,
  formatDistance,
  compassPoint,
  formatDms,
  MIN_POINTS,
  MEASURE_COLORS,
  type Measurement,
  type MeasureKind,
  type MeasureUnit,
  type LngLat,
} from '@/lib/measure';

export interface MeasureToolboxProps {
  activeTool: MeasureKind | null;
  onSelectTool: (tool: MeasureKind | null) => void;
  measurements: Measurement[];
  /** Vertices of the measurement currently being drawn on the map. */
  draft: LngLat[];
  unit: MeasureUnit;
  onUnitChange: (unit: MeasureUnit) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLocate: (points: LngLat[]) => void;
  /** Live cursor position, echoed as a coordinate readout. */
  cursor?: { lat: number; lng: number } | null;
  onClose?: () => void;
}

const TOOLS: Array<{
  kind: MeasureKind;
  label: string;
  hint: string;
  icon: typeof Ruler;
  color: string;
}> = [
  {
    kind: 'distance',
    label: 'RULER',
    hint: 'Click each waypoint. Double-click or Enter to finish the leg.',
    icon: Ruler,
    color: MEASURE_COLORS.distance,
  },
  {
    kind: 'area',
    label: 'AREA',
    hint: 'Click three or more corners. Double-click or Enter to close the shape.',
    icon: Pentagon,
    color: MEASURE_COLORS.area,
  },
  {
    kind: 'radius',
    label: 'RANGE',
    hint: 'Click the centre, then a point on the rim.',
    icon: CircleDot,
    color: MEASURE_COLORS.radius,
  },
  {
    kind: 'bearing',
    label: 'BEARING',
    hint: 'Click the origin, then the target.',
    icon: Compass,
    color: MEASURE_COLORS.bearing,
  },
];

const UNITS: Array<{ key: MeasureUnit; label: string; title: string }> = [
  { key: 'metric', label: 'KM', title: 'Metric — metres and kilometres' },
  { key: 'nautical', label: 'NM', title: 'Nautical — feet and nautical miles' },
  { key: 'imperial', label: 'MI', title: 'Imperial — feet and statute miles' },
];

const TOOL_BY_KIND = Object.fromEntries(TOOLS.map((t) => [t.kind, t])) as Record<
  MeasureKind,
  (typeof TOOLS)[number]
>;

/** Every line of detail a finished measurement can show, in read order. */
function detailRows(m: Measurement, unit: MeasureUnit): Array<[string, string]> {
  const s = measureStats(m.kind, m.points);
  const rows: Array<[string, string]> = [];
  if (m.kind === 'distance') {
    rows.push(['LENGTH', formatDistance(s.distanceM ?? 0, unit)]);
    rows.push(['LEGS', String(Math.max(0, m.points.length - 1))]);
  }
  if (m.kind === 'area') {
    rows.push(['AREA', formatArea(s.areaM2 ?? 0, unit)]);
    rows.push(['PERIMETER', formatDistance(s.perimeterM ?? 0, unit)]);
    rows.push(['VERTICES', String(m.points.length)]);
  }
  if (m.kind === 'radius') {
    rows.push(['RADIUS', formatDistance(s.radiusM ?? 0, unit)]);
    rows.push(['COVERAGE', formatArea(s.areaM2 ?? 0, unit)]);
    rows.push(['CIRCUMFERENCE', formatDistance(s.perimeterM ?? 0, unit)]);
  }
  if (m.kind === 'bearing') {
    rows.push([
      'TRUE BEARING',
      `${formatBearing(s.bearingDeg ?? 0)} ${compassPoint(s.bearingDeg ?? 0)}`,
    ]);
    rows.push(['RECIPROCAL', formatBearing(s.reverseBearingDeg ?? 0)]);
    rows.push(['RANGE', formatDistance(s.distanceM ?? 0, unit)]);
  }
  const first = m.points[0];
  if (first) {
    rows.push(['ORIGIN', `${formatDms(first[1], 'lat')} ${formatDms(first[0], 'lng')}`]);
  }
  return rows;
}

export default function MeasureToolbox({
  activeTool, onSelectTool, measurements, draft, unit, onUnitChange,
  onDelete, onClearAll, selectedId, onSelect, onLocate, cursor, onClose,
}: MeasureToolboxProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const active = activeTool ? TOOL_BY_KIND[activeTool] : null;

  // The draft only becomes a readable number once the tool has enough points;
  // before that the strip shows how many more clicks the operator owes it.
  const draftSummary = useMemo(() => {
    if (!activeTool) return null;
    const needed = MIN_POINTS[activeTool];
    if (draft.length < needed) {
      const remaining = needed - draft.length;
      return `${remaining} more point${remaining === 1 ? '' : 's'}`;
    }
    return summarise(activeTool, draft, unit);
  }, [activeTool, draft, unit]);

  const copyGeoJSON = useCallback(
    (m: Measurement) => {
      navigator.clipboard.writeText(JSON.stringify(measureCollection([m], unit), null, 2));
      setCopied(m.id);
    },
    [unit],
  );

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const exportAll = useCallback(() => {
    const blob = new Blob([JSON.stringify(measureCollection(measurements, unit), null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uzmasatria-measurements-${measurements.length}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }, [measurements, unit]);

  // Totals worth carrying at the top: how far was walked, how much ground covered.
  const totals = useMemo(() => {
    let distanceM = 0;
    let areaM2 = 0;
    for (const m of measurements) {
      const s = measureStats(m.kind, m.points);
      if (m.kind === 'distance' || m.kind === 'bearing') distanceM += s.distanceM ?? 0;
      if (m.kind === 'area' || m.kind === 'radius') areaM2 += s.areaM2 ?? 0;
    }
    return { distanceM, areaM2 };
  }, [measurements]);

  return (
    <div className="pointer-events-auto w-[300px] bg-black/90 backdrop-blur-xl border border-white/[0.06] rounded-lg overflow-hidden flex flex-col glass-panel shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
          <span className="text-[12px] font-mono tracking-[0.2em] text-white/90 font-bold">
            TOOLBOX
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center rounded overflow-hidden border border-white/10">
            {UNITS.map((u) => (
              <button
                key={u.key}
                onClick={() => onUnitChange(u.key)}
                title={u.title}
                className={`px-1.5 py-0.5 text-[9px] font-mono tracking-wider transition-colors ${
                  unit === u.key
                    ? 'bg-[var(--cyan-primary)]/20 text-[var(--cyan-primary)]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
              title="Close toolbox"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tool grid */}
      <div className="p-2 grid grid-cols-2 gap-1.5 border-b border-white/[0.04]">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const on = activeTool === tool.kind;
          return (
            <button
              key={tool.kind}
              onClick={() => onSelectTool(on ? null : tool.kind)}
              title={tool.hint}
              className={`relative flex items-center gap-2 px-2.5 py-2 rounded text-[10px] font-mono tracking-[0.15em] border transition-all ${
                on
                  ? 'text-black font-bold'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              style={
                on
                  ? {
                      backgroundColor: tool.color,
                      borderColor: tool.color,
                      boxShadow: `0 0 14px ${tool.color}55`,
                    }
                  : undefined
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Live draft readout */}
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/[0.04]"
          >
            <div className="px-3 py-2.5 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-mono tracking-[0.2em] font-bold"
                  style={{ color: active.color }}
                >
                  {active.label} ACTIVE
                </span>
                <span className="text-[12px] font-mono tabular-nums text-white/90">
                  {draftSummary}
                </span>
              </div>
              <p className="text-[9px] font-mono text-white/35 tracking-wide leading-relaxed">
                {active.hint} Esc cancels.
              </p>
              {cursor && (
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono text-white/40 tabular-nums">
                  <Crosshair className="w-2.5 h-2.5" />
                  {formatDms(cursor.lat, 'lat')} {formatDms(cursor.lng, 'lng')}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Totals */}
      {measurements.length > 0 && (
        <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
          <div className="flex flex-col">
            <span className="text-white/35 tracking-wider uppercase text-[9px]">Total length</span>
            <span className="text-[var(--cyan-primary)] font-bold tabular-nums">
              {formatDistance(totals.distanceM, unit)}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex flex-col text-right">
            <span className="text-white/35 tracking-wider uppercase text-[9px]">Total area</span>
            <span className="text-white/80 tabular-nums">{formatArea(totals.areaM2, unit)}</span>
          </div>
        </div>
      )}

      {/* Measurement list */}
      <div className="flex-1 overflow-y-auto max-h-[260px] styled-scrollbar bg-black/40">
        <AnimatePresence mode="popLayout">
          {measurements.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-7 px-4 text-center"
            >
              <Ruler className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-[10px] font-mono text-white/30 tracking-wider">
                Pick a tool and click the map.
              </p>
            </motion.div>
          ) : (
            measurements.map((m) => {
              const tool = TOOL_BY_KIND[m.kind];
              const Icon = tool.icon;
              const open = selectedId === m.id;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className={`relative border-b border-white/[0.03] cursor-pointer group ${
                    open ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                  }`}
                  onClick={() => onSelect(open ? null : m.id)}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: m.color, opacity: open ? 1 : 0.55 }}
                  />
                  <div className="px-3 py-2.5 pl-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3 h-3 shrink-0" style={{ color: m.color }} />
                        <span className="text-[11px] font-mono text-white/85 truncate">
                          {m.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-mono tabular-nums text-white/70">
                          {summarise(m.kind, m.points, unit)}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLocate(m.points);
                            }}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                            title="Fly to"
                          >
                            <Crosshair className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyGeoJSON(m);
                            }}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition"
                            title="Copy GeoJSON"
                          >
                            {copied === m.id ? (
                              <Check className="w-3 h-3 text-[var(--alert-green)]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(m.id);
                            }}
                            className="p-1 rounded bg-[#FF3D57]/10 hover:bg-[#FF3D57]/20 text-[#FF3D57]/60 hover:text-[#FF3D57] transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.dl
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2 space-y-1"
                        >
                          {detailRows(m, unit).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-baseline justify-between gap-3 text-[9px] font-mono"
                            >
                              <dt className="text-white/35 tracking-[0.15em]">{key}</dt>
                              <dd className="text-white/75 tabular-nums text-right truncate">
                                {value}
                              </dd>
                            </div>
                          ))}
                        </motion.dl>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      {measurements.length > 0 && (
        <div className="p-2.5 border-t border-white/[0.04] flex items-center gap-2 bg-black/60">
          <button
            onClick={exportAll}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[10px] font-mono tracking-[0.2em] bg-[var(--cyan-primary)]/10 border border-[var(--cyan-primary)]/30 text-[var(--cyan-primary)]/80 hover:text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 transition"
          >
            <Download className="w-3 h-3" />
            EXPORT
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono tracking-widest bg-[#FF3D57]/10 border border-[#FF3D57]/20 text-[#FF3D57]/60 hover:text-[#FF3D57] hover:bg-[#FF3D57]/20 transition"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR
          </button>
        </div>
      )}
    </div>
  );
}
