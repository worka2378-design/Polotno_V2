import { Point } from '../types';

export function screenToCanvas(
  screenX: number,
  screenY: number,
  offset: Point,
  scale: number
): Point {
  return {
    x: (screenX - offset.x) / scale,
    y: (screenY - offset.y) / scale,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  offset: Point,
  scale: number
): Point {
  return {
    x: canvasX * scale + offset.x,
    y: canvasY * scale + offset.y,
  };
}
