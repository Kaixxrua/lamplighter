// Agent E1: the bay three floors down where the book already written stands (s33; E2 may come back to it).
// One bay of the shelf wall of side PLACE.WALL on floor PLACE.DUSTY, between two of the library's dividers, rows
// 1–4, modelled with bookshelf.js so a lens can come within arm's length: the old book (the caller's record, the
// same spine as the one being written above) on its board among volumes that have not been touched for a long time.
//
// The library paints its far books on a plane at the book face (a = 0); real books on its boards stand a little
// behind that face, and so do these (the old book's spine crest at a −0.025), so the painted plane would cover
// them. A shot that comes this close draws the bay *instead of* the library: it builds its own boards, dividers
// and back, laid out as the library's (boards every 0.71 m, 0.035 thick; dividers every 2.38 m along the side),
// and it is lit through a libraryUniforms() set (the library's own, or a shot's with the same lamps, fog and floor
// states), so it sits in the same light; the shot adds a key (shelf.key) for the lamp that is nearest.
//
// Shelf space: the caller puts `shelf.group` at the old book's place (the foot of its spine crest) with the book
// orientation (x along +s, y up, z out toward the shaft). Row r of the wall stands at y = (r − row)·0.71 there.
import { BookShelf, layoutShelf, bookLabels, STRIP_TITLES, SHELF, BIND, CLOTHS } from './bookshelf.js';
import { rng } from '../runtime/lib/rng.js';

export const ROWS = [1, 2, 3, 4]; // the wall's rows that are modelled (row 0 stands on the plinth)
// The old book is the only blue on its shelf: a neighbour the layout binds in blue cloth is bound in oxblood
// instead (the palette's red cloth, darker, so a set of them does not outshine it).
const bluish = (c) => c[2] > 1.5 * c[0] && c[2] > c[1];
const OXBLOOD = CLOTHS[1].map((c) => c * 0.6);

// place: { s, row, bay: [s0, s1] } of the old book (s32's DUSTY); book: its bookshelf.js record (s32's dustyBook());
// labels: { heroes, strips: [title] } (s32's spineLabels()): the old book keeps strip 0 and hero A, the others take
// the library's own titles. Returns { shelf, layout, index } (index: the old book's place in shelf.books).
export async function dustyBay({ uniforms, place, book, labels, seed = 33, dust = [0.45, 0.95] }) {
  const half = 0.025; // a divider's half-thickness
  const x0 = place.bay[0] - place.s + half + 0.004;
  const x1 = place.bay[1] - place.s - half - 0.004;
  const rows = ROWS.map((r) => ({ y: (r - place.row) * SHELF.ROW }));
  const old = { ...book, x: 0, row: ROWS.indexOf(place.row) };
  const layout = layoutShelf({ seed, x0, x1, rows, fixed: [old] });
  const r = rng(seed + 1);
  for (const b of layout.books) {
    if (b === old) continue;
    if (b.strip >= 0) b.strip = 1 + (b.strip % 15);
    if (b.bind === BIND.CLOTH && bluish(b.col)) {
      const k = b.col[2] / CLOTHS[0][2]; // its own shade of the cloth
      b.col = OXBLOOD.map((c) => c * k);
    }
    b.dust = r.range(dust[0], dust[1]);
  }
  const lab = await bookLabels({ heroes: labels.heroes, strips: [labels.strips[0], ...STRIP_TITLES.slice(0, 15)] });
  const shelf = new BookShelf({
    uniforms,
    layout,
    labels: lab,
    dividers: [place.bay[0] - place.s, place.bay[1] - place.s],
  });
  shelf.uniforms.uShelfDust.value = 0.7;
  return { shelf, layout, index: layout.books.indexOf(old) };
}
