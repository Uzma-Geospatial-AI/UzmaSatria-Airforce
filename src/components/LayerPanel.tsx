'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Sun, AlertTriangle, Camera,
  CloudLightning, Ship, Network, Database, Ghost,
  Flame, Tv, Radio, Mountain, Anchor, Megaphone, ScanEye, Crosshair,
  Shield, ExternalLink
} from 'lucide-react';
import { IMAGERY_SCENES, sceneCenter } from '@/lib/imageryScenes';

const DEFENCE_SOLUTION_URL = 'https://platform.aetosky.com/pages/login';
/* Reuses the rail's hover state. A key no group can collide with. */
const DEFENCE_KEY = '__defence_solution__';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
  theme?: 'core' | 'ghost';
  setTheme?: (theme: 'core' | 'ghost') => void;
  /** Server-side capabilities, e.g. { cloudflare: true }. Layers declaring a
   *  `requires` key stay hidden until the matching capability is present. */
  capabilities?: Record<string, boolean>;
  /** Flies the camera to a layer's footprint. Wired for imagery scenes. */
  onFocus?: (target: { lng: number; lat: number; zoom: number }) => void;
  /** Per-layer opacity, 0..1. A missing key means fully opaque. */
  layerOpacity?: Record<string, number>;
  setLayerOpacity?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

interface LayerDef {
  key: string;
  label: string;
  dataKey: string;
  /** Reads a bucket out of data.category_counts instead of a top-level array. */
  catKey?: string;
  /** Capability that must be configured server-side for this layer to appear. */
  requires?: string;
  /** Secondary line under the label — used for a scene's site name. */
  sub?: string;
  /** Camera target. Renders a focus button; the layer covers too little ground
   *  to find by panning, so without this it is effectively unreachable. */
  focus?: { lng: number; lat: number; zoom: number };
  /** Show an opacity slider while the layer is on. Lets two captures of the
   *  same AOI be cross-faded instead of only flipped. */
  opacity?: boolean;
}

interface LayerGroupDef {
  label: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  layers: LayerDef[];
}

const LAYER_GROUPS: LayerGroupDef[] = [
  {
    label: 'IMAGERY',
    fullLabel: 'SATELLITE IMAGERY',
    icon: ScanEye,
    /* Built from the scene registry — adding a tasked capture in
       src/lib/imageryScenes.ts surfaces it here automatically. */
    layers: IMAGERY_SCENES.map(s => ({
      key: s.id,
      label: s.label,
      dataKey: '',
      sub: s.site,
      focus: { ...sceneCenter(s), zoom: 13 },
      opacity: true,
    })),
  },
  {
    label: 'SDK',
    fullLabel: 'OSIRIS SDK',
    icon: Network,
    layers: [
      { key: 'sdk_sea', label: 'Maritime Lines', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'AVIATION',
    fullLabel: 'AVIATION',
    icon: Plane,
    layers: [
      { key: 'flights', label: 'Commercial', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Private', dataKey: 'private_flights' },
      { key: 'jets', label: 'Private Jets', dataKey: 'private_jets' },
      { key: 'military', label: 'Military', dataKey: 'military_flights' },
    ],
  },
  {
    label: 'MARITIME',
    fullLabel: 'MARITIME',
    icon: Ship,
    layers: [
      { key: 'maritime', label: 'Maritime / Naval', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
    ],
  },
  {
    label: 'SPACE',
    fullLabel: 'SPACE TRACKING',
    icon: Satellite,
    layers: [
      { key: 'satellites', label: 'All Satellites', dataKey: 'satellites' },
      { key: 'sat_comms', label: 'Starlink / Comms', dataKey: 'satellites', catKey: 'comms' },
      { key: 'sat_military', label: 'Military / Intel', dataKey: 'satellites', catKey: 'military' },
      { key: 'sat_navigation', label: 'GPS / Navigation', dataKey: 'satellites', catKey: 'navigation' },
      { key: 'sat_earth', label: 'Earth Observation', dataKey: 'satellites', catKey: 'earth_obs' },
      { key: 'sat_science', label: 'Stations / Telescopes', dataKey: 'satellites', catKey: 'science' },
    ],
  },
  {
    label: 'SURVEIL',
    fullLabel: 'SURVEILLANCE',
    icon: Camera,
    layers: [
      { key: 'cctv', label: 'CCTV Cameras', dataKey: 'cameras' },
      { key: 'live_news', label: 'Live News Feeds', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'HAZARD',
    fullLabel: 'NATURAL HAZARDS',
    icon: CloudLightning,
    layers: [
      { key: 'earthquakes', label: 'Earthquakes', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Active Fires', dataKey: 'fires' },
      { key: 'weather', label: 'Severe Weather', dataKey: 'weather_events' },
    ],
  },
  {
    label: 'THREAT',
    fullLabel: 'THREATS & INTEL',
    icon: AlertTriangle,
    layers: [
      { key: 'infrastructure', label: 'Nuclear Facilities', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: 'Global Incidents', dataKey: 'gdelt' },
      { key: 'gdelt_events', label: 'GDELT Events', dataKey: 'gdelt_events' },
    ],
  },
  {
    label: 'NETWORK',
    fullLabel: 'NETWORK INTEL',
    icon: Network,
    layers: [
      { key: 'malware', label: 'Live Malware', dataKey: 'malware_threats' },
      { key: 'cyber_attacks', label: 'Live Attacks', dataKey: 'cyber_attacks' },
    ],
  },
  {
    label: 'NETINTEL',
    fullLabel: 'NET & EVENT INTEL',
    icon: Megaphone,
    layers: [
      { key: 'cf_outages', label: 'Internet Outages', dataKey: 'cf_outages', requires: 'cloudflare' },
      { key: 'cf_attacks', label: 'Attack Origins', dataKey: 'cf_attack_origins', requires: 'cloudflare' },
    ],
  },
  {
    label: 'DISPLAY',
    fullLabel: 'DISPLAY',
    icon: Sun,
    layers: [
      { key: 'day_night', label: 'Day / Night Cycle', dataKey: '' },
      { key: 'terrain_3d', label: '3D Terrain & Buildings', dataKey: '' },
    ],
  },
];

/* ── Minimal Toggle Switch ── */
function ToggleSwitch({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex-shrink-0 cursor-pointer"
      style={{ width: 28, height: 14 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: active ? '0 0 8px rgba(255,255,255,0.1)' : 'none',
        }}
      />
      <motion.div
        className="absolute top-[2px] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
          boxShadow: active ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
        animate={{ left: active ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

/* ── Opacity slider ──
   Sits under a layer row while that layer is on. stopPropagation matters: on
   desktop the whole row is a toggle target, so without it dragging the slider
   would switch the layer off. */
function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div
      className="flex items-center gap-2 pl-[40px] pr-1 pb-1.5 -mt-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onClick={(e) => e.stopPropagation()}
        className="flex-1 h-1 cursor-pointer accent-[#F26722]"
        style={{ accentColor: '#F26722' }}
        title="Layer opacity"
      />
      <span className="text-[10px] font-mono tabular-nums text-white/30 w-8 text-right">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile, theme = 'core', setTheme, capabilities = {}, onFocus, layerOpacity = {}, setLayerOpacity }: LayerPanelProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));

  /* Switching a scene on is only useful if you end up looking at it — its
     footprint is a couple of kilometres wide, so from a global view the layer
     would otherwise appear to do nothing. Enabling flies there; disabling
     leaves the camera alone. */
  const toggleLayer = (layer: LayerDef) => {
    const turningOn = !activeLayers[layer.key];
    toggle(layer.key);
    if (turningOn && layer.focus && onFocus) onFocus(layer.focus);
  };

  const opacityOf = (key: string) => layerOpacity[key] ?? 1;
  const setOpacity = (key: string, v: number) =>
    setLayerOpacity?.((prev) => ({ ...prev, [key]: v }));

  /* Drop layers whose backing capability is not configured, then drop any group
     left with nothing to show. */
  const visibleGroups = LAYER_GROUPS.map(g => ({
    ...g,
    layers: g.layers.filter(l => !l.requires || capabilities[l.requires]),
  })).filter(g => g.layers.length > 0);

  const getCount = (dk: string, catKey?: string): number | null => {
    if (!dk) return null;
    if (catKey && data.category_counts) {
      return data.category_counts[catKey] || 0;
    }
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  /* ── MOBILE ── */
  if (isMobile) {
    return (
      <div className="flex flex-col gap-5 py-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-white/30 border-b border-white/[0.06] pb-1.5">
              {group.fullLabel}
            </div>
            <div className="flex flex-col gap-1">
              {group.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey, layer.catKey);
                return (
                  <div key={layer.key}>
                  <div className="flex items-center gap-3 px-1 py-1.5">
                    <ToggleSwitch
                      active={!!isLayerActive}
                      onClick={() => toggleLayer(layer)}
                    />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[12px] font-mono uppercase tracking-wider transition-colors ${isLayerActive ? 'text-white/80' : 'text-white/40'}`}>
                        {layer.label}
                      </span>
                      {layer.sub && (
                        <span className="block text-[10px] font-mono tracking-wide text-white/25 truncate">{layer.sub}</span>
                      )}
                    </span>
                    {layer.focus && onFocus && (
                      <button
                        onClick={() => onFocus(layer.focus!)}
                        title="Fly to footprint"
                        className="p-1 rounded text-white/30 hover:text-[#F26722] transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {count !== null && (
                      <span className="text-[10px] font-mono tabular-nums text-white/20">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {layer.opacity && isLayerActive && setLayerOpacity && (
                    <OpacitySlider value={opacityOf(layer.key)} onChange={(v) => setOpacity(layer.key, v)} />
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* MOBILE GHOST TOGGLE */}
        {setTheme && (
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/[0.06] px-1">
            <span className="text-[11px] font-mono tracking-[0.2em] text-white/25 uppercase">Ghost Protocol</span>
            <button
              onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: theme === 'ghost' ? 'rgba(179, 136, 255, 0.15)' : 'transparent',
                boxShadow: theme === 'ghost' ? '0 0 12px rgba(179, 136, 255, 0.3)' : 'none',
              }}
            >
              <Ghost className="w-4 h-4" style={{ color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.25)' }} />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200, delay: 2.8 }}
      className="absolute top-0 left-0 h-full w-[48px] flex flex-col items-center pt-24 pb-6 z-50 pointer-events-auto"
      style={{
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
      }}
    >
      <div className="flex-1 flex flex-col items-center gap-1">
        {visibleGroups.map((group) => {
          const groupActive = group.layers.some(l => activeLayers[l.key]);
          const isHovered = hoveredGroup === group.label;
          const Icon = group.icon;

          return (
            <div
              key={group.label}
              className="relative flex items-center justify-center"
              onMouseEnter={() => setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              {/* Icon Button */}
              <div
                className="w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-300"
                style={{
                  background: isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                <Icon
                  className="transition-all duration-300"
                  style={{
                    width: 16,
                    height: 16,
                    color: groupActive
                      ? 'rgba(255,255,255,0.7)'
                      : isHovered
                        ? 'rgba(255,255,255,0.4)'
                        : 'rgba(255,255,255,0.2)',
                    filter: groupActive ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none',
                  }}
                />
              </div>

              {/* Flyout (LEFT side) */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -4, filter: 'blur(2px)' }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute left-[52px] top-1/2 -translate-y-1/2 min-w-[220px] rounded-xl p-3 z-[100] pointer-events-auto"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(40px) saturate(1.5)',
                      WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-white/30 mb-2.5 pb-1.5 border-b border-white/[0.04]">
                      {group.fullLabel}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.layers.map((layer) => {
                        const isLayerActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey, layer.catKey);

                        return (
                          <div key={layer.key}>
                          <div
                            className="flex items-center gap-3 px-1 py-[5px] rounded-md hover:bg-white/[0.03] transition-colors cursor-pointer"
                            onClick={() => toggleLayer(layer)}
                          >
                            <ToggleSwitch active={!!isLayerActive} onClick={() => {}} />
                            <span className="flex-1 min-w-0">
                              <span className={`block text-[12px] font-mono uppercase tracking-wider transition-colors duration-200 ${isLayerActive ? 'text-white/70' : 'text-white/35'}`}>
                                {layer.label}
                              </span>
                              {layer.sub && (
                                <span className="block text-[10px] font-mono tracking-wide text-white/25 truncate">{layer.sub}</span>
                              )}
                            </span>
                            {layer.focus && onFocus && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onFocus(layer.focus!); }}
                                title="Fly to footprint"
                                className="p-1 rounded text-white/30 hover:text-[#F26722] transition-colors"
                              >
                                <Crosshair className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {count !== null && (
                              <span className="text-[11px] font-mono tabular-nums text-white/20">
                                {count.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {layer.opacity && isLayerActive && setLayerOpacity && (
                            <OpacitySlider value={opacityOf(layer.key)} onChange={(v) => setOpacity(layer.key, v)} />
                          )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* ── Defence Solution ──
            Not a layer: an outbound link to the Aetosky platform. It closes the
            group column, sitting directly under the DISPLAY group's sun, and
            carries the brand orange so it does not read as one more group of
            toggles. The rail is icon-only, so it gets the same hover flyout the
            groups use — a shield on its own would say nothing. */}
        <div
          className="order-first relative flex items-center justify-center"
          onMouseEnter={() => setHoveredGroup(DEFENCE_KEY)}
          onMouseLeave={() => setHoveredGroup(null)}
        >
          <a
            href={DEFENCE_SOLUTION_URL}
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300"
            style={{ background: hoveredGroup === DEFENCE_KEY ? 'rgba(242,103,34,0.12)' : 'transparent' }}
            aria-label="Defence Solution — opens the Aetosky platform"
          >
            <Shield
              className="transition-all duration-300"
              style={{
                width: 16,
                height: 16,
                color: hoveredGroup === DEFENCE_KEY ? '#F26722' : 'rgba(242,103,34,0.55)',
                filter: hoveredGroup === DEFENCE_KEY ? 'drop-shadow(0 0 6px rgba(242,103,34,0.5))' : 'none',
              }}
            />
          </a>

          <AnimatePresence>
            {hoveredGroup === DEFENCE_KEY && (
              <motion.div
                initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -4, filter: 'blur(2px)' }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="absolute left-[52px] top-1/2 -translate-y-1/2 min-w-[220px] rounded-xl p-3 z-[100] pointer-events-auto"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(40px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                  border: '1px solid rgba(242,103,34,0.2)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <div className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#F26722]/70 mb-2 pb-1.5 border-b border-white/[0.04]">
                  Defence Solution
                </div>
                <a
                  href={DEFENCE_SOLUTION_URL}
                  className="flex items-center gap-2 text-[12px] font-mono text-white/60 hover:text-white transition-colors"
                >
                  <span className="flex-1">Open the Aetosky platform</span>
                  <ExternalLink className="w-3 h-3 text-[#F26722]" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Subtle separator */}
      <div className="w-5 h-px bg-white/[0.06] my-2" />

      {/* Ghost Protocol Toggle */}
      {setTheme && (
        <button
          onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
          className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-500 cursor-pointer"
          style={{
            background: theme === 'ghost' ? 'rgba(179, 136, 255, 0.1)' : 'transparent',
          }}
          title="Ghost Protocol"
        >
          <Ghost
            className="transition-all duration-500"
            style={{
              width: 15,
              height: 15,
              color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.15)',
              filter: theme === 'ghost' ? 'drop-shadow(0 0 6px rgba(179, 136, 255, 0.5))' : 'none',
            }}
          />
        </button>
      )}
    </motion.div>
  );
}

export default memo(LayerPanel);
