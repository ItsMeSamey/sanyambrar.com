import type { Cell } from './thinking-shapes.ts';

export function arrowDirection(angle: number) {
  return ['right', 'down', 'left', 'up'][((Math.round(angle / 90) % 4) + 4) % 4];
}

/** Describe the displayed grid, not the source shape or its answer category. */
export function rotationDescription(cells: readonly Cell[], angle: number, mirrored = false) {
  const rotation = ((angle % 360) + 360) % 360;
  const quarterTurns = Math.floor(rotation / 90);
  const displayed = cells.map(([column, row]) => {
    let x = mirrored ? -column : column, y = row;
    for (let turn = 0; turn < quarterTurns; turn++) [x, y] = [-y, x];
    return [x, y];
  });
  const left = Math.min(...displayed.map(([x]) => x)), top = Math.min(...displayed.map(([, y]) => y));
  const columns = Math.max(...displayed.map(([x]) => x)) - left + 1;
  const rows = Math.max(...displayed.map(([, y]) => y)) - top + 1;
  const occupancy = Array.from({ length: rows }, (_, row) => {
    const filled = displayed.filter(([, y]) => y - top === row).map(([x]) => x - left + 1).sort((a, b) => a - b);
    return `Row ${row + 1}: columns ${filled.join(', ')}`;
  }).join('; ');
  const tilt = rotation % 90;
  return `${cells.length} filled squares; ${rows} rows by ${columns} columns. ${occupancy}. Rows run top to bottom and columns left to right${tilt ? ` before a ${tilt}-degree clockwise grid tilt` : ''}.`;
}
