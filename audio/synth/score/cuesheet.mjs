// The cue sheet as the score reads it: engine/tools/cues.mjs, run in its own process, cached in
// audio/out/cache/cues.json. A cue at local second t of a shot sits on global frame start + 24·t − offset,
// that is on sample (start − offset)·2000 + round(48000·t): an integer, and the score puts the sync point
// of the sound there exactly. Shots that have no CUES yet (their modules are not written) raise on cues().
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SR, SPF } from '../lib/const.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const CACHE = path.join(ROOT, 'audio/out/cache/cues.json');

/** rows of the cue sheet; refresh runs the tool (a few seconds), otherwise the cache is used if present */
export function loadRows({ refresh = true } = {}) {
  if (!refresh && fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const r = spawnSync(process.execPath, ['--no-warnings', 'engine/tools/cues.mjs'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`engine/tools/cues.mjs failed:\n${r.stderr}`);
  const rows = JSON.parse(r.stdout);
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(rows, null, 1));
  return rows;
}

/** resolve a cue path such as 'strokes.燃[0]' or 'pings[3]' or 'title.t' inside a row's cues */
export function resolve(cues, p) {
  let v = cues;
  for (const part of p.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (v == null || !(part in Object(v))) throw new Error(`no cue ${p}`);
    v = v[part];
  }
  return v;
}

export class CueSheet {
  constructor(rows) { this.rows = new Map(rows.filter((r) => r.id).map((r) => [r.id, r])); }
  row(id) { const r = this.rows.get(id); if (!r) throw new Error(`no shot ${id}`); return r; }
  has(id) { return !!this.rows.get(id)?.cues; }
  cues(id) { const r = this.row(id); if (!r.cues) throw new Error(`${id}: ${r.error || 'no CUES'}`); return r.cues; }
  /** the sample of local second t in shot id */
  sample(id, t) { const r = this.row(id); return (r.start - r.offset) * SPF + Math.round(t * SR); }
  /** the cue at path p of shot id (a number of seconds) → { t, sample } */
  at(id, p) { const t = resolve(this.cues(id), p); if (typeof t !== 'number') throw new Error(`${id}.${p} is not a time`); return { t, sample: this.sample(id, t) }; }
  /** global seconds of local second t (exactly sample / SR) */
  sec(id, t) { return this.sample(id, t) / SR; }
  start(id) { return this.row(id).start * SPF; }
  /** a card of film/timeline.json → samples: { start, end, fadeIn, fadeOut, beats: [each layer's entry] } */
  card(id) {
    if (!this.cards) this.cards = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8')).cards.map((c) => [c.id, c]));
    const c = this.cards.get(id);
    if (!c) throw new Error(`no card ${id}`);
    return { start: c.start * SPF, end: c.end * SPF, fadeIn: c.fadeIn * SPF, fadeOut: c.fadeOut * SPF, beats: c.layers.map((l) => (c.start + (l.delay || 0)) * SPF) };
  }
  end(id) { const r = this.row(id); return (r.start + r.frames) * SPF; }
}
