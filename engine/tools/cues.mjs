// The score's cue sheet, read from the shots themselves: every shot module exports CUES (times in
// its own local seconds), and this loads each one in Node under the engine's import map, without a
// browser and without calling setup, then places the cues on the film's clock with the timeline.
//
//   node --no-warnings engine/tools/cues.mjs              every row, JSON on stdout
//   node --no-warnings engine/tools/cues.mjs s17 s18 s19  only these rows
//   (--no-warnings: the shots are ES modules with no package.json saying so, and Node says so.)
//
// Each row comes out as { id, module, start, frames, offset, lang, cues, at }, `at` spelling out the
// rule: a cue at local second t sits on global frame start + 24·t − offset (s45 shares s44.js from
// t = 12, offset 288). A module that cannot load outside the browser, or has no CUES (s01–s06 have
// none: BIBLE §9's table times them), comes out with `error` instead of `cues`.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAP = {
  'three': 'engine/vendor/three/build/three.module.js',
  'three/addons/': 'engine/vendor/three/examples/jsm/',
  'film/': 'engine/runtime/',
  'world/': 'engine/world/',
  'shots/': 'shots/',
};

const hooks = `
const MAP = ${JSON.stringify(Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k, pathToFileURL(path.join(ROOT, v)).href])))};
export async function resolve(spec, ctx, next) {
  if (MAP[spec]) return { url: MAP[spec], shortCircuit: true };
  for (const [k, v] of Object.entries(MAP)) if (k.endsWith('/') && spec.startsWith(k)) return { url: v + spec.slice(k.length), shortCircuit: true };
  return next(spec, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const timeline = JSON.parse(readFileSync(path.join(ROOT, 'film/timeline.json'), 'utf8'));
const rows = (Array.isArray(timeline) ? timeline : timeline.rows ?? timeline.shots).filter((r) => r.id);
const want = process.argv.slice(2);
const out = [];
for (const r of rows) {
  if (want.length && !want.includes(r.id)) continue;
  const row = { id: r.id, module: r.module, start: r.start, frames: r.frames, offset: r.offset ?? 0, lang: !!r.lang,
    at: 'global frame = start + 24·t − offset' };
  try {
    const m = await import(pathToFileURL(path.join(ROOT, 'shots', `${r.module}.js`)).href);
    if (m.CUES) row.cues = m.CUES;
    else row.error = 'no CUES export';
  } catch (e) {
    row.error = String(e?.message ?? e).split('\n')[0];
  }
  out.push(row);
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
