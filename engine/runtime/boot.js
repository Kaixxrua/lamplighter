import { Film } from './core/film.js';

const q = new URLSearchParams(location.search);
const width = +q.get('w') || 960;
const film = new Film({
  shot: q.get('shot') || '_lookdev',
  width,
  height: +q.get('h') || Math.round((width * 9) / 16),
  quality: q.get('quality') || 'preview',
  lang: q.get('lang') || 'zh',
  samples: q.get('samples') ? +q.get('samples') : null,
  renderScale: q.get('scale') ? +q.get('scale') : null,
});
window.film = film;
film
  .init()
  .then((info) => {
    window.filmInfo = info;
    window.filmReady = true;
  })
  .catch((e) => {
    window.filmError = String((e && e.stack) || e);
    console.error(window.filmError);
  });
