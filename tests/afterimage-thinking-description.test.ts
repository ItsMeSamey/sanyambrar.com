import { expect, test } from 'bun:test';
import { arrowDirection, rotationDescription } from '../src/games/afterimage/thinking-description';

const shape = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [1, 2], [2, 2]] as const;

test('search direction labels follow clockwise SVG screen rotation including wrapped angles', () => {
  expect([0, 90, 180, 270, 360, 450, -90].map(arrowDirection)).toEqual(['right', 'down', 'left', 'up', 'right', 'down', 'up']);
});

test('rotation labels describe the occupied grid after its displayed quarter-turn', () => {
  expect(rotationDescription(shape, 90)).toBe('8 filled squares; 4 rows by 3 columns. Row 1: columns 1, 2, 3; Row 2: columns 1, 3; Row 3: columns 1, 3; Row 4: columns 3. Rows run top to bottom and columns left to right.');
  expect(rotationDescription(shape, 450)).toBe(rotationDescription(shape, 90));
});

test('reflection changes occupied columns without disclosing the answer category', () => {
  const description = rotationDescription(shape, 0, true);
  expect(description).toContain('Row 1: columns 1, 2, 3, 4; Row 2: columns 4; Row 3: columns 2, 3, 4.');
  expect(description).not.toMatch(/mirror|changed|same shape/i);
  expect(description).not.toBe(rotationDescription(shape, 0));
});

test('diagonal views retain their screen tilt after describing the turned grid', () => {
  expect(rotationDescription(shape, 135)).toBe(rotationDescription(shape, 90).replace('left to right.', 'left to right before a 45-degree clockwise grid tilt.'));
});

test('descriptions apply the SVG reflection before its rotation', () => {
  expect(rotationDescription(shape, 90, true)).toContain('Row 1: columns 3; Row 2: columns 1, 3; Row 3: columns 1, 3; Row 4: columns 1, 2, 3.');
});
