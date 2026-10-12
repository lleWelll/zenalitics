export const SEPARATOR_CANDIDATES = [' / ', '/', ': '] as const;

/** Разделитель подкатегорий по справочнику: самый частый из кандидатов. `null` — иерархии нет. */
export function detectSeparator(categories: readonly string[]): string | null {
  const taken = new Set<string>();
  let best: string | null = null;
  let bestCount = 0;
  for (const sep of SEPARATOR_CANDIDATES) {
    let count = 0;
    for (const category of categories) {
      if (!taken.has(category) && category.includes(sep)) {
        taken.add(category);
        count++;
      }
    }
    if (count > bestCount) {
      best = sep;
      bestCount = count;
    }
  }
  return best;
}

export function splitPath(category: string, sep: string | null): string[] {
  if (!sep) return [category];
  const parts = category.split(sep).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [category];
}

export const joinPath = (parts: readonly string[], sep: string | null): string => parts.join(sep ?? '');

export type CategoryNode = {
  /** Полный путь — ключ для URL и провала. */
  path: string;
  name: string;
  depth: number;
  /** Сумма всего поддерева. */
  total: number;
  txCount: number;
  /** Операции прямо в этой категории (у родителя — «без подкатегории»). */
  own: { total: number; txCount: number } | null;
  children: CategoryNode[];
};

export type Amount = { category: string; total: number; tx_count: number };

function sortTree(nodes: CategoryNode[]): void {
  nodes.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ru'));
  for (const node of nodes) sortTree(node.children);
}

/** Строки `top` → дерево категорий. Суммы родителей — это суммы строк API, ничего не пересчитывается. */
export function buildTree(rows: readonly Amount[], sep: string | null): CategoryNode[] {
  const roots: CategoryNode[] = [];
  const byPath = new Map<string, CategoryNode>();
  for (const row of rows) {
    const parts = splitPath(row.category, sep);
    let level = roots;
    parts.forEach((name, i) => {
      const leaf = i === parts.length - 1;
      const path = leaf ? row.category : joinPath(parts.slice(0, i + 1), sep);
      let node = byPath.get(path);
      if (!node) {
        node = { path, name, depth: i + 1, total: 0, txCount: 0, own: null, children: [] };
        byPath.set(path, node);
        level.push(node);
      }
      node.total += row.total;
      node.txCount += row.tx_count;
      if (leaf) node.own = { total: (node.own?.total ?? 0) + row.total, txCount: (node.own?.txCount ?? 0) + row.tx_count };
      level = node.children;
    });
  }
  sortTree(roots);
  return roots;
}

export function findNode(nodes: readonly CategoryNode[], path: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    const found = findNode(node.children, path);
    if (found) return found;
  }
  return null;
}

/** Путь от корня: `['Продукты', 'Продукты / Рынок']`. */
export function ancestry(path: string, sep: string | null): string[] {
  const parts = splitPath(path, sep);
  return parts.map((_, i) => (i === parts.length - 1 ? path : joinPath(parts.slice(0, i + 1), sep)));
}

export const topLevelPath = (category: string, sep: string | null): string => ancestry(category, sep)[0] ?? category;

export const isWithin = (category: string, path: string, sep: string | null): boolean =>
  category === path || (sep !== null && category.startsWith(path + sep));

export function sumWithin(rows: readonly Amount[], path: string, sep: string | null): { total: number; txCount: number } {
  let total = 0;
  let txCount = 0;
  for (const row of rows) {
    if (isWithin(row.category, path, sep)) {
      total += row.total;
      txCount += row.tx_count;
    }
  }
  return { total, txCount };
}
