import { expect, test } from 'bun:test';
import { clampContextMenu, contextMenuBounds } from '../src/shared/contextMenuGeometry.ts';

const layout = { width: 390, height: 844 };

test('context menu uses layout viewport when the visual viewport is unavailable', () => {
  const bounds = contextMenuBounds(layout);
  expect(bounds).toEqual({ left: 8, top: 8, width: 374, height: 828 });
  expect(clampContextMenu({ x: 389, y: 843 }, { width: 146, height: 54 }, bounds)).toEqual({ x: 236, y: 782 });
});

test('keyboard viewport constrains the menu above the keyboard including its vertical offset', () => {
  const bounds = contextMenuBounds(layout, { width: 390, height: 300, offsetTop: 230, offsetLeft: 0 });
  expect(bounds).toEqual({ left: 8, top: 238, width: 374, height: 284 });
  expect(clampContextMenu({ x: 20, y: 700 }, { width: 192, height: 54 }, bounds)).toEqual({ x: 20, y: 468 });
});

test('pinch zoom and pan clamp all edges in layout coordinates', () => {
  const bounds = contextMenuBounds(layout, { width: 195, height: 300, offsetLeft: 60, offsetTop: 140 });
  expect(bounds).toEqual({ left: 68, top: 148, width: 179, height: 284 });
  expect(clampContextMenu({ x: 360, y: 700 }, { width: 146, height: 54 }, bounds)).toEqual({ x: 101, y: 378 });
  expect(clampContextMenu({ x: 0, y: 0 }, { width: 146, height: 54 }, bounds)).toEqual({ x: 68, y: 148 });
});

test('narrow or short menus get usable size caps and stay within the visible viewport', () => {
  const bounds = contextMenuBounds(layout, { width: 128, height: 80, offsetLeft: 31, offsetTop: 77 });
  expect(bounds.width).toBe(112);
  expect(bounds.height).toBe(64);
  expect(clampContextMenu({ x: 300, y: 800 }, { width: bounds.width, height: bounds.height }, bounds)).toEqual({ x: 39, y: 85 });
});

test('viewport expansion does not move an already visible menu', () => {
  const bounds = contextMenuBounds(layout, { ...layout, offsetLeft: 0, offsetTop: 0 });
  const point = { x: 30, y: 300 };
  expect(clampContextMenu(point, { width: 192, height: 54 }, bounds)).toEqual(point);
});
