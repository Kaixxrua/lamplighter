// Typography: font loading, title-card typesetting, canvas textures for in-world lettering.
import * as THREE from 'three';

const F = '/engine/fonts/';
export const FONTS = {
  serif: { family: 'LL Serif SC', faces: [
    { src: 'NotoSerifSC-ExtraLight.otf', weight: '200' },
    { src: 'NotoSerifSC-Light.otf', weight: '300' },
    { src: 'NotoSerifSC-Regular.otf', weight: '400' },
  ] },
  garamond: { family: 'LL Garamond', faces: [
    { src: 'EBGaramond-VF.ttf', weight: '400 800' },
    { src: 'EBGaramond-Italic-VF.ttf', weight: '400 800', style: 'italic' },
  ] },
  mono: { family: 'LL Mono', faces: [{ src: 'JetBrainsMono-VF.ttf', weight: '100 800' }] },
  display: { family: 'LL Display', faces: [{ src: 'Anton-Regular.ttf', weight: '400' }] },
};

let fontsLoaded = null;
export function loadFonts() {
  if (fontsLoaded) return fontsLoaded;
  const jobs = [];
  for (const def of Object.values(FONTS)) {
    for (const face of def.faces) {
      const ff = new FontFace(def.family, `url(${F}${face.src})`, {
        weight: face.weight,
        style: face.style || 'normal',
      });
      jobs.push(ff.load().then((f) => document.fonts.add(f)));
    }
  }
  fontsLoaded = Promise.all(jobs).then(() => document.fonts.ready);
  return fontsLoaded;
}

export const font = (fam, size, weight = 400, style = 'normal') =>
  `${style} ${weight} ${Math.round(size * 100) / 100}px "${FONTS[fam].family}"`;

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Draw one tracked line centred on (cx, baselineY). letterSpacing in px.
// Canvas adds tracking after every glyph, including the last; compensate so the ink is centred.
export function drawTracked(ctx, text, cx, y, { tracking = 0, align = 'center' } = {}) {
  ctx.letterSpacing = `${tracking}px`;
  const w = ctx.measureText(text).width - tracking;
  let x = cx;
  if (align === 'center') x = cx - w / 2;
  else if (align === 'right') x = cx - w;
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
  return w;
}

function fitLine(ctx, text, famFont, size, weight, style, tracking, maxW, opts = {}) {
  let s = size;
  let tr = tracking;
  for (let i = 0; i < 40; i++) {
    ctx.font = font(famFont, s, weight, style);
    if (opts.caps) ctx.fontVariantCaps = opts.caps;
    ctx.letterSpacing = `${tr * s}px`;
    const w = ctx.measureText(text).width - tr * s;
    if (w <= maxW) break;
    if (tr > (opts.minTracking ?? 0.06)) tr = Math.max(opts.minTracking ?? 0.06, tr - 0.02);
    else s *= 0.97;
  }
  return { size: s, tracking: tr };
}

// Title-card typography, scaled to output height H. Paper colour, faint optical halo.
export const CARD_STYLE = {
  zh: { fam: 'serif', weight: 300, size: 0.0315, tracking: 0.32 },
  en: { fam: 'garamond', weight: 450, size: 0.0262, tracking: 0.12, caps: 'all-small-caps' },
  attribZh: { fam: 'serif', weight: 300, size: 0.0205, tracking: 0.24 },
  attribEn: { fam: 'garamond', weight: 420, size: 0.0215, tracking: 0.04, style: 'italic' },
  gapZhEn: 0.024, // between the Chinese line's baseline and the English cap line
  gapBeat: 0.062,
  gapAttrib: 0.040,
  maxWidth: 0.80,
  color: [247, 245, 238],
  enAlpha: 0.80,
  attribAlpha: 0.62,
};

// Typeset a card. card.layers = [{ zh, en, attribZh?, attribEn? }, ...] (one layer per beat).
// Returns one transparent canvas per layer, each with the beat drawn at its final position,
// so later beats can fade in while earlier ones stay put.
export function typesetCard(card, W, H, style = CARD_STYLE) {
  const meas = makeCanvas(8, 8).getContext('2d');
  const maxW = style.maxWidth * W;
  const rows = card.layers.map((L) => {
    const r = [];
    const add = (key, text, st) => {
      if (!text) return;
      const fit = fitLine(meas, text, st.fam, st.size * H, st.weight, st.style || 'normal', st.tracking, maxW, {
        caps: st.caps,
      });
      r.push({ key, text, st, size: fit.size, tracking: fit.tracking });
    };
    add('zh', L.zh, style.zh);
    add('en', L.en, style.en);
    add('attribZh', L.attribZh, style.attribZh);
    add('attribEn', L.attribEn, style.attribEn);
    return r;
  });

  // Vertical layout: compute baselines for every row of every beat.
  const placed = [];
  let y = 0;
  rows.forEach((r, li) => {
    if (li > 0) y += style.gapBeat * H;
    r.forEach((row, ri) => {
      const prev = r[ri - 1];
      if (ri === 0) y += row.size * 0.88;
      else if (row.key === 'en') y += style.gapZhEn * H + row.size * 0.62;
      else if (row.key === 'attribZh') y += style.gapAttrib * H + row.size * 0.88;
      else if (row.key === 'attribEn') y += (prev && prev.key === 'attribZh' ? 0.018 * H : style.gapAttrib * H) + row.size * 0.7;
      placed.push({ li, row, y });
    });
    y += r.length ? r[r.length - 1].size * 0.22 : 0;
  });
  const blockH = y;
  const top = H / 2 - blockH / 2 - 0.006 * H; // optical centre sits slightly high

  return card.layers.map((_, li) => {
    const cv = makeCanvas(W, H);
    const ctx = cv.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    for (const p of placed) {
      if (p.li !== li) continue;
      const { row } = p;
      const st = row.st;
      const alpha = row.key === 'zh' ? 1 : row.key === 'en' ? style.enAlpha : style.attribAlpha;
      const [r, g, b] = style.color;
      ctx.font = font(st.fam, row.size, st.weight, st.style || 'normal');
      ctx.fontVariantCaps = st.caps || 'normal';
      const tr = row.tracking * row.size;
      // halo pass, then crisp pass
      ctx.save();
      ctx.shadowColor = `rgba(${r},${g},${b},${0.32 * alpha})`;
      ctx.shadowBlur = 0.010 * H;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.35 * alpha})`;
      drawTracked(ctx, row.text, W / 2, top + p.y, { tracking: tr });
      ctx.restore();
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      drawTracked(ctx, row.text, W / 2, top + p.y, { tracking: tr });
    }
    return cv;
  });
}

// Canvas → texture. srgb=true for textures used by lit scene materials (decoded to linear);
// srgb=false for overlays composited in display space.
export function canvasTexture(canvas, { srgb = true, mipmaps = true, anisotropy = 8, premultiply = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = mipmaps;
  t.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = anisotropy;
  t.premultiplyAlpha = premultiply;
  t.needsUpdate = true;
  return t;
}
