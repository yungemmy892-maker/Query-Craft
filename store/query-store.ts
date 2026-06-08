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
  isHydrated:    boolean;   // ← flips true after client storage is loaded

  // ─── History & Presets ──────────────────────────────────────────────────────
  queryHistory:  HistoryEntry[];
  savedPresets:  QueryPreset[];

  // ─── Validation ─────────────────────────────────────────────────────────────
  validation:    ValidationResult;

  // ─── UI State ───────────────────────────────────────────────────────────────
  activePanel:     'builder' | 'preview' | 'results';
  expandedGroups:  Record<string, boolean>;

  // ─── Actions ────────────────────────────────────────────────────────────────
  hydrate:         () => void;   // called once from a client useEffect
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

// The SSR-safe initial root — stable ID, no random values
const SSR_ROOT = makeRootGroup();
const SSR_PREVIEW = buildPreview(SSR_ROOT, 'users');

// ─── Store ────────────────────────────────────────────────────────────────────

export const useQueryStore = create<QueryState>()(
  subscribeWithSelector((set, get) => ({

    // ─── Initial State (SSR-safe — no localStorage, no random IDs) ────────────
    schemaKey:      'users',
    root:           SSR_ROOT,
    results:        null,
    queryPreview:   SSR_PREVIEW,
    isDarkMode:     true,        // default; overridden in hydrate()
    isRunning:      false,
    isHydrated:     false,
    queryHistory:   [],
    savedPresets:   [],
    validation:     { valid: true, errors: [] },
    activePanel:    'builder',
    expandedGroups: { [ROOT_GROUP_ID]: true },

    // ─── hydrate() ─────────────────────────────────────────────────────────────
    // Called once from a client-side useEffect. Reads localStorage/cookies and
    // patches state — by this point React has already committed to the DOM, so
    // there is no hydration mismatch window.
    hydrate: () => {
      if (get().isHydrated) return;

      const savedTheme   = storage.getTheme();
      const savedSchema  = (storage.getSchema() as SchemaKey) ?? 'users';
      const savedQuery   = storage.getQuery();
      const savedPresets = storage.getPresets();
      const savedHistory = storage.getHistory();

      // If a persisted query exists, re-stamp the root ID so the cookie root
      // (which may have a random ID from a previous session) is used as-is.
      // If no persisted query, keep the stable SSR root.
      const root = savedQuery ?? get().root;
      const preview = buildPreview(root, savedSchema);

      set({
        schemaKey:    savedSchema,
        root,
        queryPreview: preview,
        isDarkMode:   savedTheme === 'dark',
        queryHistory: savedHistory,
        savedPresets: savedPresets,
        isHydrated:   true,
        expandedGroups: { [root.id]: true },
      });
    },

    // ─── Schema ────────────────────────────────────────────────────────────────
    setSchema: (key) => {
      const root = makeRootGroup();
      storage.setSchema(key);
      storage.setQuery(root);
      set({
        schemaKey:    key,
        root,
        results:      null,
        activePanel:  'builder',
        queryPreview: buildPreview(root, key),
        validation:   { valid: true, errors: [] },
        expandedGroups: { [root.id]: true },
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
      const cond   = makeCondition(name);  // uid() is fine here — client-only call
      const root   = addNodeToGroup(get().root, groupId, cond);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({ root, queryPreview: preview });
    },

    addGroup: (groupId) => {
      const group  = makeGroup('AND');     // uid() is fine here — client-only call
      const root   = addNodeToGroup(get().root, groupId, group);
      const preview = buildPreview(root, get().schemaKey);
      storage.setQuery(root);
      set({
        root,
        queryPreview: preview,
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
        results:      null,
        activePanel:  'builder',
        queryPreview: buildPreview(root, get().schemaKey),
        validation:   { valid: true, errors: [] },
        expandedGroups: { [root.id]: true },
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
        id:        uid(),
        name,
        schemaKey,
        root:      deepClone(root),
        sql:       queryPreview,
        createdAt: formatDate(),
      };
      const presets = [...get().savedPresets, preset];
      storage.setPresets(presets);
      set({ savedPresets: presets });
    },

    loadPreset: (preset) => {
      storage.setSchema(preset.schemaKey);
      storage.setQuery(preset.root);
      set({
        schemaKey:    preset.schemaKey as SchemaKey,
        root:         deepClone(preset.root),
        results:      null,
        activePanel:  'builder',
        queryPreview: preset.sql,
        validation:   { valid: true, errors: [] },
      });
    },

    deletePreset: (id) => {
      const presets = get().savedPresets.filter(p => p.id !== id);
      storage.setPresets(presets);
      set({ savedPresets: presets });
    },

    // ─── History ───────────────────────────────────────────────────────────────
    loadFromHistory: (entry) => {
      storage.setSchema(entry.schemaKey);
      storage.setQuery(entry.root);
      set({
        schemaKey:    entry.schemaKey as SchemaKey,
        root:         deepClone(entry.root),
        results:      null,
        activePanel:  'builder',
        queryPreview: entry.sql,
        validation:   { valid: true, errors: [] },
      });
    },

    clearHistory: () => {
      storage.clearHistory();
      set({ queryHistory: [] });
    },

    // ─── Import / Export ────────────────────────────────────────────────────────
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
          storage.setSchema(data.schemaKey);
          storage.setQuery(data.root);
          set({
            schemaKey:    data.schemaKey,
            root:         data.root,
            results:      null,
            activePanel:  'builder',
            queryPreview: buildPreview(data.root, data.schemaKey),
            validation:   { valid: true, errors: [] },
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
