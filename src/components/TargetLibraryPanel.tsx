'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X, ChevronLeft, Layers3 } from 'lucide-react';
import {
  loadIndex, loadCategory, assetUrl, filterClasses,
  type CategorySummary, type CategoryLibrary, type TargetClass,
} from '@/lib/targetLibrary';

/* Chip filter — group / origin. null means "all". */
function Chips({ options, value, onChange }: {
  options: string[]; value: string | null; onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {[null, ...options].map(opt => {
        const on = value === opt;
        return (
          <button
            key={opt ?? '__all'}
            onClick={() => onChange(opt)}
            className={`px-2 py-[3px] rounded text-[10px] font-mono tracking-wider uppercase transition-colors ${
              on ? 'bg-[#F26722]/20 text-[#F26722] border border-[#F26722]/40'
                 : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/70'}`}
          >
            {opt ?? 'All'}
          </button>
        );
      })}
    </div>
  );
}

/* Detail view. Deliberately the same shape a detection drawer will need:
   reference silhouette, class metadata, then the category reporting form.
   Once real detections exist, Section 1 arrives pre-filled from the detection
   and the imagery chip sits beside the silhouette. */
function ClassDetail({ item, category, onBack }: {
  item: TargetClass; category: CategorySummary | undefined; onBack: () => void;
}) {
  const meta: Array<[string, string]> = [
    ['CATEGORY', category ? `${category.code} ${category.name}` : '--'],
    ['GROUP', item.group],
    ['ORIGIN', item.origin],
    ['VIEW', 'Plan'],
    ['PLATE SIZE', `${item.px[0]} x ${item.px[1]} px`],
    ['ASPECT', String(item.aspect)],
    ['CLASS ID', item.slug],
    ['SOURCE', `p${item.source_page}`],
  ];

  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack}
        className="flex items-center gap-1 text-[11px] font-mono tracking-wider text-white/40 hover:text-white/80 mb-3">
        <ChevronLeft className="w-3.5 h-3.5" /> BACK TO LIBRARY
      </button>

      <div className="rounded-lg bg-black/40 border border-white/[0.06] p-4 flex items-center justify-center min-h-[180px]">
        <img src={assetUrl(item.file)} alt={item.class} className="max-h-[220px] w-auto object-contain" />
      </div>

      <div className="mt-3">
        <h3 className="text-[15px] font-bold text-white/90 tracking-wide">{item.class}</h3>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
          {meta.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-white/25 text-[9px] tracking-[0.15em]">{k}</span>
              <span className="text-white/70 truncate" title={v}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {category && (
        <div className="mt-4">
          <div className="text-[10px] font-mono tracking-[0.2em] text-white/30 mb-2 pb-1 border-b border-white/[0.06]">
            REPORTING FORM &mdash; CATEGORY {category.code}
          </div>
          <ol className="space-y-1">
            {category.sections.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-[#F26722]/70 w-4 text-right">{i + 1}.</span>
                <span className="text-white/55">{s}</span>
                {i === 0 && (
                  <span className="ml-auto text-[9px] text-white/25 tracking-wider">FROM DETECTION</span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10px] text-white/25 leading-relaxed">
            Section 1 is supplied by a detection (centre lat/lon and type).
            Sections 2 to 7 are completed by the analyst.
          </p>
        </div>
      )}
    </div>
  );
}

export default function TargetLibraryPanel() {
  const [index, setIndex] = useState<CategorySummary[]>([]);
  const [source, setSource] = useState('');
  const [lib, setLib] = useState<CategoryLibrary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [selected, setSelected] = useState<TargetClass | null>(null);
  const [catCode, setCatCode] = useState<string | null>(null);

  /* Only categories with an extracted class plate are offered. The other 17
     exist in categories.json but have no silhouettes yet, and an empty grid
     reads as a broken feature. */
  const withLibrary = useMemo(() => index.filter(c => c.library), [index]);
  const category = useMemo(() => index.find(c => c.code === catCode), [index, catCode]);

  useEffect(() => {
    loadIndex()
      .then(ix => {
        setIndex(ix.categories);
        setSource(ix.source);
        const first = ix.categories.find(c => c.library);
        if (first) setCatCode(first.code);
      })
      .catch(e => setErr(String(e)));
  }, []);

  useEffect(() => {
    if (!category?.library) return;
    setLib(null);
    loadCategory(category.library.dir).then(setLib).catch(e => setErr(String(e)));
  }, [category]);

  const shown = useMemo(
    () => (lib ? filterClasses(lib.classes, q, group, origin) : []),
    [lib, q, group, origin]
  );

  return (
    <div className="rounded-xl p-3 w-full h-[70vh] max-h-[720px] flex flex-col pointer-events-auto"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(40px) saturate(1.5)',
                  WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
        <Layers3 className="w-4 h-4 text-[#F26722]" />
        <span className="text-[11px] font-mono tracking-[0.2em] text-white/60">TARGET LIBRARY</span>
        {lib && !selected && (
          <span className="ml-auto text-[10px] font-mono tabular-nums text-white/30">
            {shown.length}/{lib.count}
          </span>
        )}
      </div>

      {err && <div className="mt-3 text-[11px] text-red-400 font-mono">{err}</div>}

      <div className="flex-1 overflow-y-auto mt-3 pr-1">
        {selected ? (
          <ClassDetail item={selected} category={category} onBack={() => setSelected(null)} />
        ) : (
          <>
            {withLibrary.length > 1 && (
              <div className="mb-3">
                <Chips
                  options={withLibrary.map(c => `${c.code} ${c.name}`)}
                  value={category ? `${category.code} ${category.name}` : null}
                  onChange={v => setCatCode(v ? v.split(' ')[0] : null)}
                />
              </div>
            )}

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search class, group, origin"
                className="w-full bg-white/[0.04] border border-white/[0.07] rounded pl-7 pr-7 py-1.5 text-[12px] font-mono text-white/80 placeholder-white/25 focus:outline-none focus:border-[#F26722]/50"
              />
              {q && (
                <button onClick={() => setQ('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {lib && (
              <div className="flex flex-col gap-1.5 mb-3">
                <Chips options={[...new Set(lib.classes.map(c => c.group))]} value={group} onChange={setGroup} />
                <Chips options={[...new Set(lib.classes.map(c => c.origin))]} value={origin} onChange={setOrigin} />
              </div>
            )}

            {!lib && !err && (
              <div className="text-[11px] font-mono text-white/30 py-8 text-center">Loading library</div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {shown.map(c => (
                <button
                  key={`${c.slug}-${c.group}-${c.origin}`}
                  onClick={() => setSelected(c)}
                  className="group rounded-lg border border-white/[0.05] bg-black/30 hover:border-[#F26722]/40 hover:bg-black/50 transition-colors p-2 flex flex-col items-center"
                  title={`${c.class} - ${c.origin} ${c.group}`}
                >
                  <div className="h-[62px] w-full flex items-center justify-center">
                    {/* 128 PNGs is ~6 MB total; lazy so scrolling pays only for what it shows. */}
                    <img src={assetUrl(c.file)} alt={c.class} loading="lazy"
                         className="max-h-[58px] max-w-full object-contain" />
                  </div>
                  <span className="mt-1 text-[9px] font-mono uppercase tracking-wide text-white/45 group-hover:text-white/80 text-center leading-tight">
                    {c.class}
                  </span>
                </button>
              ))}
            </div>

            {lib && shown.length === 0 && (
              <div className="text-[11px] font-mono text-white/30 py-8 text-center">
                No classes match that filter.
              </div>
            )}

            {source && (
              <p className="mt-4 pt-2 border-t border-white/[0.05] text-[9px] text-white/20 leading-relaxed">
                {source}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
