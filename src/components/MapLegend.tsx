'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, X } from 'lucide-react';
import { activeLegend, legendItemCount, type LegendItem, type LegendSection } from '@/lib/legend';

interface MapLegendProps {
  activeLayers: Record<string, boolean | undefined>;
  theme?: 'core' | 'ghost';
  onClose?: () => void;
  /** Drops the frame and the close button for the mobile drawer. */
  embedded?: boolean;
}

/** The swatch drawn beside a legend row, matching the map's own symbol. */
function Swatch({ item }: { item: LegendItem }) {
  const shape = item.shape ?? 'dot';

  if (shape === 'plane') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill={item.color} aria-hidden>
        <path d="M12 2 13.5 9.5 22 12.5v2L13.5 13 13 19l3 2v1.5l-4-1.2-4 1.2V21l3-2-.5-6L2 14.5v-2l8.5-3z" />
      </svg>
    );
  }

  if (shape === 'triangle') {
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-hidden>
        <path d="M12 2 23 22H1z" fill={item.color} />
        <path d="M12 9v6" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (shape === 'line' || shape === 'dashed') {
    return (
      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" aria-hidden>
        <line
          x1="1" y1="8" x2="15" y2="8"
          stroke={item.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={shape === 'dashed' ? '3 3' : undefined}
        />
      </svg>
    );
  }

  if (shape === 'ramp') {
    return (
      <span
        className="w-3.5 h-3.5 shrink-0 rounded-sm"
        style={{ background: `linear-gradient(135deg, ${item.color}, ${item.toColor ?? item.color})` }}
      />
    );
  }

  if (shape === 'fill') {
    return (
      <span
        className="w-3.5 h-3.5 shrink-0 rounded-sm border"
        style={{ backgroundColor: `${item.color}66`, borderColor: `${item.color}aa` }}
      />
    );
  }

  if (shape === 'ring') {
    return (
      <span
        className="w-3 h-3 shrink-0 rounded-full border-2 mx-[1px]"
        style={{ borderColor: item.color }}
      />
    );
  }

  return (
    <span
      className="w-2.5 h-2.5 shrink-0 rounded-full mx-[2px]"
      style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}88` }}
    />
  );
}

function Section({ section }: { section: LegendSection }) {
  return (
    <div className="px-3 py-2.5 border-b border-white/[0.03] last:border-b-0">
      <div className="text-[9px] font-mono tracking-[0.2em] text-white/35 mb-1.5">
        {section.title}
      </div>
      <div className="space-y-1">
        {section.items.map((item) => (
          <div key={`${item.label}-${item.color}`} className="flex items-center gap-2">
            <Swatch item={item} />
            <span className="text-[10px] font-mono text-white/70 leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
      {section.note && (
        <p className="text-[9px] font-mono text-white/25 mt-1.5 leading-relaxed">{section.note}</p>
      )}
    </div>
  );
}

export default function MapLegend({ activeLayers, theme = 'core', onClose, embedded }: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  const sections = useMemo(() => activeLegend(activeLayers, theme), [activeLayers, theme]);
  const count = legendItemCount(sections);

  const body = sections.length === 0 ? (
    <div className="px-4 py-6 text-center">
      <BookOpen className="w-5 h-5 text-white/10 mx-auto mb-2" />
      <p className="text-[10px] font-mono text-white/30 tracking-wider">
        No layers on. Switch one on to see what its symbols mean.
      </p>
    </div>
  ) : (
    <div className="overflow-y-auto max-h-[min(60vh,420px)] styled-scrollbar">
      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  );

  if (embedded) return <div className="bg-black/40 rounded-lg overflow-hidden">{body}</div>;

  return (
    <div className="pointer-events-auto w-[240px] bg-black/90 backdrop-blur-xl border border-white/[0.06] rounded-lg overflow-hidden glass-panel shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
      <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 min-w-0 group"
          title={collapsed ? 'Expand legend' : 'Collapse legend'}
        >
          <BookOpen className="w-3.5 h-3.5 text-[var(--cyan-primary)] shrink-0" />
          <span className="text-[11px] font-mono tracking-[0.2em] text-white/90 font-bold">
            LEGEND
          </span>
          <span className="text-[9px] font-mono text-white/30 tabular-nums">{count}</span>
          <ChevronDown
            className={`w-3 h-3 text-white/30 group-hover:text-white/60 transition-transform ${
              collapsed ? '-rotate-90' : ''
            }`}
          />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Hide legend"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
