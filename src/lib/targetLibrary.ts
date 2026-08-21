/**
 * OSIRIS — Target library.
 *
 * Recognition reference extracted from the ImStrat "Target Category Reporting
 * List for Imagery Intelligence Analysis" (2006): 19 IMINT target categories,
 * each carrying the same 7-section reporting form, plus per-category class
 * plates of plan-view silhouettes.
 *
 * Plan view matters — it is the aspect a satellite actually sees, which is what
 * makes these usable as a detection reference rather than just a poster.
 *
 * Assets live in public/detection-library/ and are fetched at runtime rather
 * than bundled: 128 PNGs is ~6 MB and none of it is needed until the operator
 * opens the panel.
 */

export const LIBRARY_BASE = '/detection-library';

export interface TargetClass {
  /** Display name exactly as printed on the source plate. */
  class: string;
  /** Stable id. A future detection references this to resolve its class. */
  slug: string;
  /** e.g. 'Fixed Wing' | 'Rotary Wing' */
  group: string;
  /** e.g. 'NATO' | 'CIS' */
  origin: string;
  /** Path relative to LIBRARY_BASE. */
  file: string;
  /** Native size of the silhouette on the source plate, in plate pixels.
   *  The plates are comparative-size charts, so these are proportional to
   *  real airframe size and can be used to sanity-check a detection's extent. */
  px: [number, number];
  aspect: number;
  source_page: number;
}

export interface CategoryLibrary {
  category_code: string;
  category: string;
  source: string;
  view: string;
  count: number;
  classes: TargetClass[];
}

export interface CategorySummary {
  code: string;
  name: string;
  /** The 7 reporting sections shared by every category. */
  sections: string[];
  library?: { dir: string; count: number; groups: string[]; origins: string[] };
}

export interface LibraryIndex {
  source: string;
  category_count: number;
  categories: CategorySummary[];
}

const cache = new Map<string, unknown>();

async function getJson<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit) return hit as T;
  const res = await fetch(`${LIBRARY_BASE}/${path}`);
  if (!res.ok) throw new Error(`target library: ${path} -> ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(path, data);
  return data;
}

export const loadIndex = () => getJson<LibraryIndex>('index.json');
export const loadCategory = (dir: string) => getJson<CategoryLibrary>(`${dir}/manifest.json`);
export const assetUrl = (file: string) => `${LIBRARY_BASE}/${file}`;

/** Free-text match across name, group and origin. */
export function filterClasses(classes: TargetClass[], q: string, group: string | null, origin: string | null) {
  const needle = q.trim().toLowerCase();
  return classes.filter(c => {
    if (group && c.group !== group) return false;
    if (origin && c.origin !== origin) return false;
    if (!needle) return true;
    return `${c.class} ${c.group} ${c.origin}`.toLowerCase().includes(needle);
  });
}
