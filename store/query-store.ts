import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Group, QueryNode, QueryPreset, HistoryEntry, ValidationResult } from '@/types';
import { SCHEMAS, DATASETS, type SchemaKey } from '@/data';
import {
  makeRootGroup, makeGroup, makeCondition, ROOT_GROUP_ID,
  uid, deepClone, formatTimestamp, formatDate,
  updateNodeInTree, removeNodeFromTree, addNodeToGroup, reorderChildren,
} from '@/lib/utils';
import { executeQuery, generateQueryPreview, validateQuery } from '@/lib/query-engine';
import { storage } from '@/lib/storage';

interface QueryState {
  // ─── Core ───────────────────────────────────────────────────────────────────
  schemaKey:     SchemaKey;
  root:          Group;
  results:       Record<string, unknown>[] | null;
  queryPreview:  string;
  isDarkMode:    boolean;
  isRunning:     boolean;
  isHydrated:    boolean;

  // ─── History & Presets ──────────────────────────────────────────────────────
  queryHistory:  HistoryEntry[];
  savedPresets:  QueryPreset[];

  // ─── Validation ─────────────────────────────────────────────────────────────
  validation:    ValidationResult;

  // ─── UI State ───────────────────────────────────────────────────────────────
  activePanel:     'builder' | 'preview' | 'results';
  expandedGroups:  Record<string, boolean>;

  // ─── Actions ────────────────────────────────────────────────────────────────
  hydrate:         () => void;
  setSchema:       (key: SchemaKey) => void;
  setDarkMode:     (v: boolean) => void;
  setActivePanel:  (p: 'builder' | 'preview' | 'results') => void;

  updateNode:    (nodeId: string, updater: (n: QueryNode) => QueryNode) => void;
  removeNode:    (nodeId: string) => void;
  addCondition:  (groupId: string, fieldName?: string) => void;
  addGroup:      (groupId: string) => void;
  reorderNodes:  (groupId: string, from: number, to: number) => void;
  toggleGroup:   (groupId: string) => void;
  resetQuery:    () => void;

  runQuery:      () => void;

  savePreset:    (name: string) => void;
  loadPreset:    (preset: QueryPreset) => void;
  deletePreset:  (id: string) => void;

  loadFromHistory: (entry: HistoryEntry) => void;
  clearHistory:    () => void;

  exportJSON:    () => void;
  importJSON:    (json: string) => void;
  exportCSV:     () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreview(root: Group, schemaKey: string): string {
  const schema = SCHEMAS[schemaKey as SchemaKey];
  return generateQueryPreview(root, schemaKey, schema.fields);
}

/**
 * Re-stamp the root node with the stable ROOT_GROUP_ID so that a
 * cookie-persisted root (which may carry a random UUID from a previous
 * session) never triggers a hydration mismatch on the root group element.
 * Child nodes keep their own IDs — they are only rendered after hydration.
 */
function normaliseRoot(root: Group): Group {
  return { ...root, id: ROOT_GROUP_ID };
}

// SSR-safe initial values — stable IDs, no localStorage/cookie access.
const SSR_ROOT    = makeRootGroup();            // id === ROOT_GROUP_ID
const SSR_PREVIEW = buildPreview(SSR_ROOT, 'users');

// ─── Store ────────────────────────────────────────────────────────────────────

export const useQueryStore = create<QueryState>()(
  subscribeWithSelector((set, get) => ({

    // ─── Initial State ─────────────────────────────────────────────────────────
    // Must match what the server renders. No random values, no storage reads.
    schemaKey:      'users',
    root:           SSR_ROOT,
    results:        null,
    queryPreview:   SSR_PREVIEW,
    isDarkMode:     true,
    isRunning:      false,
    isHydrated:     false,
    queryHistory:   [],
    savedPresets:   [],
    validation:     { valid: true, errors: [] },
    activePanel:    'builder',
    expandedGroups: { [ROOT_GROUP_ID]: true },

    // ─── hydrate() ─────────────────────────────────────────────────────────────
    // Called once from a useEffect in page.tsx — runs only on the client,
    // after React has committed the SSR HTML. Any state changes here happen
    // outside the hydration window and are safe.
    hydrate: () => {
      if (get().isHydrated) return;

      const savedTheme    = storage.getTheme();
      const savedSchema   = (storage.getSchema() as SchemaKey) ?? 'users';
      const rawQuery      = storage.getQuery();
      const savedPresets  = storage.getPresets();
      const savedHistory  = storage.getHistory();

      // Re-stamp root ID to ROOT_GROUP_ID so it is always stable.
      const root    = rawQuery ? normaliseRoot(rawQuery) : get().root;
      const preview = buildPreview(root, savedSchema);

      set({
        schemaKey:      savedSchema,
        root,
        queryPreview:   preview,
        isDarkMode:     savedTheme === 'dark',
        queryHistory:   savedHistory,
        savedPresets:   savedPresets,
        isHydrated:     true,
        expandedGroups: { [root.id]: true },
      });
    },

    // ─── Schema ────────────────────────────────────────────────────────────────
    setSchema: (key) => {
      const root = makeRootGroup();
      storage.setSchema(key);
      storage.setQuery(root);
      set({
        schemaKey:      key,
        root,
        results:        null,
        activePanel:    'builder',
        queryPreview:   buildPreview(root, key),
        validation:     { valid: true, errors: [] },
        expandedGroups: { [ROOT_GROUP_ID]: true },
      });
    },

    // ─── Theme ─────────────────────────────────────────────────────────────────
    setDarkMode: (v) => {
      storage.setTheme(v ? 'dark' : 'light');
      set({ isDarkMode: v });
    },

    setActivePanel: (p) => set({ activePanel: p }),

    // ─── Tree Mutations ─────────────────────────────────────────────────────────
    updateNode: (nodeId, updater) => {
      const root    = updateNodeInTree(get().root, nodeId, updater);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({ root, queryPreview: preview });
    },

    removeNode: (nodeId) => {
      const root    = removeNodeFromTree(get().root, nodeId);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({ root, queryPreview: preview });
    },

    addCondition: (groupId, fieldName) => {
      const schema = SCHEMAS[get().schemaKey];
      const name   = fieldName ?? schema.fields[0].name;
      const cond   = makeCondition(name);
      const root   = addNodeToGroup(get().root, groupId, cond);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({ root, queryPreview: preview });
    },

    addGroup: (groupId) => {
      const group   = makeGroup('AND');
      const root    = addNodeToGroup(get().root, groupId, group);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({
        root,
        queryPreview:   preview,
        expandedGroups: { ...get().expandedGroups, [group.id]: true },
      });
    },

    reorderNodes: (groupId, from, to) => {
      const root = reorderChildren(get().root, groupId, from, to);
      storage.setQuery(root);
      set({ root });
    },

    toggleGroup: (groupId) => {
      const current = get().expandedGroups;
      set({ expandedGroups: { ...current, [groupId]: !(current[groupId] ?? true) } });
    },

    resetQuery: () => {
      const root = makeRootGroup();
      storage.setQuery(root);
      set({
        root,
        results:        null,
        activePanel:    'builder',
        queryPreview:   buildPreview(root, get().schemaKey),
        validation:     { valid: true, errors: [] },
        expandedGroups: { [ROOT_GROUP_ID]: true },
      });
    },

    // ─── Execution ─────────────────────────────────────────────────────────────
    runQuery: () => {
      const { root, schemaKey, queryPreview } = get();
      const schema  = SCHEMAS[schemaKey];
      const dataset = DATASETS[schemaKey] as Record<string, unknown>[];

      const validation = validateQuery(root, schema.fields);
      set({ validation });
      if (!validation.valid) return;

      set({ isRunning: true });
      setTimeout(() => {
        const results = executeQuery(root, dataset);
        const entry: HistoryEntry = {
          id:           uid(),
          schemaKey,
          root:         deepClone(root),
          sql:          queryPreview,
          resultCount:  results.length,
          timestamp:    formatTimestamp(),
        };
        storage.pushHistory(entry);
        set(state => ({
          results,
          isRunning:    false,
          activePanel:  'results',
          queryHistory: [entry, ...state.queryHistory].slice(0, 50),
        }));
      }, 80);
    },

    // ─── Presets ───────────────────────────────────────────────────────────────
    savePreset: (name) => {
      const { root, schemaKey, queryPreview } = get();
      const preset: QueryPreset = {
        id:         uid(),
        name,
        schemaKey,
        root:       deepClone(root),
        sql:        queryPreview,
        createdAt:  formatDate(),
      };
      const presets = [...get().savedPresets, preset];
      storage.setPresets(presets);
      set({ savedPresets: presets });
    },

    loadPreset: (preset) => {
      const root = normaliseRoot(deepClone(preset.root));
      storage.setSchema(preset.schemaKey);
      storage.setQuery(root);
      set({
        schemaKey:      preset.schemaKey as SchemaKey,
        root,
        results:        null,
        activePanel:    'builder',
        queryPreview:   preset.sql,
        validation:     { valid: true, errors: [] },
        expandedGroups: { [ROOT_GROUP_ID]: true },
      });
    },

    deletePreset: (id) => {
      const presets = get().savedPresets.filter(p => p.id !== id);
      storage.setPresets(presets);
      set({ savedPresets: presets });
    },

    // ─── History ───────────────────────────────────────────────────────────────
    loadFromHistory: (entry) => {
      const root = normaliseRoot(deepClone(entry.root));
      storage.setSchema(entry.schemaKey);
      storage.setQuery(root);
      set({
        schemaKey:      entry.schemaKey as SchemaKey,
        root,
        results:        null,
        activePanel:    'builder',
        queryPreview:   entry.sql,
        validation:     { valid: true, errors: [] },
        expandedGroups: { [ROOT_GROUP_ID]: true },
      });
    },

    clearHistory: () => {
      storage.clearHistory();
      set({ queryHistory: [] });
    },

    // ─── Import / Export ───────────────────────────────────────────────────────
    exportJSON: () => {
      const { root, schemaKey, queryPreview } = get();
      const data = { schemaKey, root, sql: queryPreview, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `querycraft-${schemaKey}.json`; a.click();
      URL.revokeObjectURL(url);
    },

    importJSON: (json: string) => {
      try {
        const data = JSON.parse(json);
        if (data.schemaKey && data.root && SCHEMAS[data.schemaKey as SchemaKey]) {
          const root = normaliseRoot(data.root);
          storage.setSchema(data.schemaKey);
          storage.setQuery(root);
          set({
            schemaKey:      data.schemaKey,
            root,
            results:        null,
            activePanel:    'builder',
            queryPreview:   buildPreview(root, data.schemaKey),
            validation:     { valid: true, errors: [] },
            expandedGroups: { [ROOT_GROUP_ID]: true },
          });
        }
      } catch { /* invalid JSON — silently ignore */ }
    },

    exportCSV: () => {
      const { results, schemaKey } = get();
      if (!results || results.length === 0) return;
      const schema  = SCHEMAS[schemaKey];
      const headers = schema.fields.map(f => f.name);
      const rows    = results.map(r => headers.map(h => JSON.stringify(r[h] ?? '')));
      const csv     = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob    = new Blob([csv], { type: 'text/csv' });
      const url     = URL.createObjectURL(blob);
      const a       = document.createElement('a');
      a.href = url; a.download = `${schemaKey}-results.csv`; a.click();
      URL.revokeObjectURL(url);
    },
  }))
);
