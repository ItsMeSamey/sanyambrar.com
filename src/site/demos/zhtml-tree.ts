export type ZhtmlNode = { index: number; depth: number; tag: string; text: string; matched: boolean };
export type ZhtmlRow = ZhtmlNode & { parent: number; end: number };

// The adapter exports the real node table in preorder. Depth changes recover
// parent and subtree boundaries without reparsing the HTML in JavaScript.
export function describeZhtmlTree(nodes: readonly ZhtmlNode[]): ZhtmlRow[] {
  const rows: ZhtmlRow[] = [];
  const stack: ZhtmlRow[] = [];
  for (const node of nodes) {
    while (stack.length && stack[stack.length - 1]!.depth >= node.depth) stack.pop();
    const row = { ...node, parent: stack[stack.length - 1]?.index ?? 0, end: node.index };
    rows.push(row);
    stack.push(row);
  }
  const byIndex = new Map(rows.map(row => [row.index, row]));
  for (let position = rows.length - 1; position >= 0; position--) {
    const row = rows[position]!;
    const parent = byIndex.get(row.parent);
    if (parent) parent.end = Math.max(parent.end, row.end);
  }
  return rows;
}

export function zhtmlNodeText(rows: readonly ZhtmlRow[], node: ZhtmlRow): string {
  return rows.filter(row => row.index >= node.index && row.index <= node.end && row.tag === '#text').map(row => row.text).join('');
}
