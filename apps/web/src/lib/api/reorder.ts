export function moveInOrder(
  ids: string[],
  index: number,
  direction: 'up' | 'down',
): string[] {
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ids.length) {
    return ids
  }
  const next = [...ids]
  const moved = next[index]
  const swapped = next[target]
  if (moved === undefined || swapped === undefined) {
    return ids
  }
  next[index] = swapped
  next[target] = moved
  return next
}
