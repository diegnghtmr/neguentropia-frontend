export type Segment = { text: string; match: boolean };

export function highlightSegments(text: string, positions: readonly number[], length: number): Segment[] {
  const ranges: [number, number][] = [];
  for (const start of positions) {
    const end = start + length;
    const last = ranges[ranges.length - 1];
    if (last && start < last[1]) {
      last[1] = end;
    } else {
      ranges.push([start, end]);
    }
  }
  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}
