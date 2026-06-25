export function getWindow(input: { orderedIds: string[]; start: number; size: number }) {
  const start = Math.max(0, Math.min(input.start, input.orderedIds.length));
  const end = Math.max(start, Math.min(start + input.size, input.orderedIds.length));
  return {
    start,
    end,
    ids: input.orderedIds.slice(start, end),
  };
}
