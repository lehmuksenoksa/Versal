// The hatching inked off the main thread (a mockup): given the strokes once,
// and then a depth map, it inks them with the pen onto an OffscreenCanvas
// and sends the picture back, so the game would not stop while it is done.

import { strokesToInk, hatchPaths } from "./stamps.js";

let strokes = null;
self.onmessage = ({ data }) => {
  if (data.strokes) {
    strokes = data.strokes;
    self.postMessage({ ready: true });
    return;
  }
  const { grey, mw, mh, TS, S, w, h, scale, colour } = data, t0 = performance.now();
  const c = new OffscreenCanvas(w, h), g = c.getContext("2d");
  g.setTransform(scale, 0, 0, scale, 0, 0);
  hatchPaths(g, strokesToInk(strokes, grey, mw, mh, TS, S), colour);
  const picture = c.transferToImageBitmap();
  self.postMessage({ picture, ms: performance.now() - t0 }, [picture]);
};
