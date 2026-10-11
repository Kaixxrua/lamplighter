// Agent E1: where Act III's first half happens (s30–s36), and where E2's s40 dives to.
// The machine reader comes in by a doorway of floor K, writes its book at a shelf wall of that floor, and the
// same book stands three floors down, gathering dust. shots/s32.js re-exports this for E2 (with the two books).
//   a: metres out from the book plane toward the shaft, s: along the side (screen right when facing the wall),
//   y: above the floor of floor k.
import { LIB } from 'world/libshader.js';
import { sidePoint } from 'world/geo.js';

export const PLACE = {
  K: 30, // the gallery of the new reader (s30–s32, s34–s36): far above the lighthouse's floor (-100)
  DUSTY: 27, // K - 3: the floor of the book that was already written (s33, s40)
  DOOR: 1, // the doorway it comes in by (sides 1 and 4 are doorways; side 1 faces +z)
  WALL: 0, // the shelf wall it writes at: the side next to that doorway, on its left
  FACE: LIB.AW - 0.4, // the plane the books are drawn on; a doorway's wall face stands 0.06 m out from it
};

// a point in a side's frame, as a Vector3
export const at = (side, k, a, s, y) => sidePoint(side, PLACE.FACE - a, s, k * LIB.H + y);
