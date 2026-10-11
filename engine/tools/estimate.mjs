// The Windows render's time estimate (windows.mjs). A frame takes a fixed time and a time in proportion
// to its samples, and the engine sizes each frame's samples to the camera's travel (from the shot's own
// floor up to 96; film/plan.json has every frame's, from render.mjs --plan with the picture locked). The
// timed frames (gpu-check --bench: n frames from the middle of a few rows) give two estimates that
// bracket the film's: their seconds per frame × the film's frames, and their seconds per sample × the
// film's samples. The two agree when the timed frames have the film's mean samples.
//
//   estimate({ timeline, jobs, bench, n, plan, together }) → { lo, hi, samples }  (seconds; samples null
//   without a plan that covers every job)
//   jobs: [{ r: timeline row, lang }]; bench: [{ id, setup, perFrame }]; together: renders at once (1, 2)

// a row's per-frame samples in a language (the en plan only for rows whose en differs), or null
export function samplesOf(plan, id, lang = 'zh') {
  if (!plan || !plan.zh) return null;
  return (plan[lang] && plan[lang][id]) || plan.zh[id] || null;
}

// the mean samples of a bench row's timed frames, or null when the plan does not have the row
export function timedSamples(plan, timeline, id, n) {
  const r = timeline.shots.find((q) => q.id === id);
  const s = r && samplesOf(plan, id);
  if (!s || s.length !== r.frames || !(n > 0)) return null;
  const f0 = Math.floor(r.frames / 2);
  const t = s.slice(f0, f0 + n);
  return t.reduce((a, b) => a + b, 0) / t.length;
}

export function estimate({ timeline, jobs, bench, n = 4, plan = null, together = 1 }) {
  const frames = jobs.reduce((t, j) => t + j.r.frames, 0);
  const perFrame = bench.reduce((t, x) => t + x.perFrame, 0) / bench.length;
  const setup = bench.reduce((t, x) => t + x.setup, 0) / bench.length;
  let samples = 0;
  for (const j of jobs) {
    const s = samplesOf(plan, j.r.id, j.lang);
    if (!s || s.length !== j.r.frames) {
      samples = null;
      break;
    }
    samples += s.reduce((a, b) => a + b, 0);
  }
  const timed = bench.map((x) => timedSamples(plan, timeline, x.id, n));
  const bySamples = samples === null || timed.includes(null)
    ? null
    : (samples * bench.reduce((t, x) => t + x.perFrame, 0)) / timed.reduce((a, b) => a + b, 0);
  const [lo, hi] = [frames * perFrame, bySamples ?? frames * perFrame]
    .map((t) => (t + jobs.length * (setup + 5)) / (together === 2 ? 1.3 : 1))
    .sort((a, b) => a - b);
  return { lo, hi, samples };
}
