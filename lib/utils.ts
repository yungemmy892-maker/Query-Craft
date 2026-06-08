import type { Group, Condition, QueryNode } from '@/types';

// ─── ID Generation ────────────────────────────────────────────────────────────

export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Node Factories ───────────────────────────────────────────────────────────

/**
 * Creates a new condition node.
 * Always call this client-side (inside event handlers / useEffect),
 * never at module level or inside Zustand's create() initialiser.
 */
export function makeCondition(fieldName: string): Condition {
  return { id: uid(), type: 'condition', field: fieldName, operator: 'equals', value: '', valueTo: '' };
}

/**
 * Creates a new group node.
 * When id is provided (e.g. ROOT_GROUP_ID) the node is stable across SSR/client.
 */
export function makeGroup(logic: 'AND' | 'OR' = 'AND', id?: string): Group {
  return { id: id ?? uid(), type: 'group', logic, children: [], collapsed: false };
}

// ─── Stable root ID — same on server and client ───────────────────────────────
export const ROOT_GROUP_ID = 'root-group';

export function makeRootGroup(): Group {
  return makeGroup('AND', ROOT_GROUP_ID);
}

// ─── Recursive Tree Mutation ──────────────────────────────────────────────────

export function updateNodeInTree(root: Group, nodeId: string, updater: (node: QueryNode) => QueryNode): Group {
  if (root.id === nodeId) return updater(root) as Group;
  return {
    ...root,
    children: root.children.map(child => {
      if (child.id === nodeId) return updater(child);
      if (child.type === 'group') return updateNodeInTree(child, nodeId, updater);
      return child;
    }),
  };
}

export function removeNodeFromTree(root: Group, nodeId: string): Group {
  return {
    ...root,
    children: root.children
      .filter(c => c.id !== nodeId)
      .map(c => c.type === 'group' ? removeNodeFromTree(c, nodeId) : c),
  };
}

export function addNodeToGroup(root: Group, groupId: string, node: QueryNode): Group {
  if (root.id === groupId) return { ...root, children: [...root.children, node] };
  return {
    ...root,
    children: root.children.map(c => c.type === 'group' ? addNodeToGroup(c, groupId, node) : c),
  };
}

export function reorderChildren(root: Group, groupId: string, from: number, to: number): Group {
  if (root.id === groupId) {
    const children = [...root.children];
    const [moved] = children.splice(from, 1);
    children.splice(to, 0, moved);
    return { ...root, children };
  }
  return {
    ...root,
    children: root.children.map(c => c.type === 'group' ? reorderChildren(c, groupId, from, to) : c),
  };
}

// ─── Tree Stats ───────────────────────────────────────────────────────────────

export function countNodes(group: Group): number {
  if (!group.children) return 0;
  return group.children.reduce((acc, c) =>
    acc + (c.type === 'group' ? countNodes(c) + 1 : 1), 0);
}

export function countConditions(group: Group): number {
  if (!group.children) return 0;
  return group.children.reduce((acc, c) =>
    acc + (c.type === 'group' ? countConditions(c) : 1), 0);
}

export function treeDepth(group: Group): number {
  if (!group.children || group.children.length === 0) return 0;
  const childDepths = group.children
    .filter(c => c.type === 'group')
    .map(c => treeDepth(c as Group));
  return 1 + (childDepths.length ? Math.max(...childDepths) : 0);
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}
