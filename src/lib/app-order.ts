// Ordering of apps inside a category (Boss Controls ↑ / ↓).

type Orderable = { id: string; sort_order: number; created_at: string };

/** Same order the store uses: sort_order ascending, newest first on ties. */
export function byCategoryOrder<T extends Orderable>(apps: T[]): T[] {
  return [...apps].sort((a, b) => a.sort_order - b.sort_order || b.created_at.localeCompare(a.created_at));
}

/**
 * Moves one app up or down and returns the sort_order writes needed. The whole category is
 * renumbered 1..n, so moves work even when apps still share the default sort_order of 0.
 */
export function moveInCategory<T extends Orderable>(apps: T[], index: number, dir: -1 | 1): { id: string; sort_order: number }[] {
  const list = byCategoryOrder(apps);
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [];
  [list[index], list[target]] = [list[target]!, list[index]!];
  return list.flatMap((a, i) => (a.sort_order === i + 1 ? [] : [{ id: a.id, sort_order: i + 1 }]));
}
