// Composites the parallax layers as the camera would see them at a given position, for review
// before the level is assembled in Godot.
import { Canvas } from "../lib/canvas.mjs";

/**
 * layers: [{ canvas, scale: [sx, sy], at: [x, y] }] far to near; at is the layer image's position in
 * its Parallax2D's local space. camera: the view's top-left in level space.
 */
export function composite(layers, camera, view = [640, 360]) {
  const out = new Canvas(view[0], view[1]);
  for (const layer of layers) {
    const [sx, sy] = layer.scale;
    const ox = Math.round(layer.at[0] - camera[0] * sx);
    const oy = Math.round(layer.at[1] - camera[1] * sy);
    out.blit(layer.canvas, ox, oy);
  }
  return out;
}
