'use client';

import { useEffect } from 'react';
import { Layers, Code2, Play } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import Header from '@/components/ui/Header';
import SchemaPanel from '@/components/query-builder/SchemaPanel';
import QueryWorkspace from '@/components/query-builder/QueryWorkspace';
import ResultsPanel from '@/components/query-builder/ResultsPanel';
import HistoryPanel from '@/components/query-builder/HistoryPanel';
import SQLPreviewPanel from '@/components/query-builder/SQLPreviewPanel';

export default function Home() {
  const isDarkMode     = useQueryStore(s => s.isDarkMode);
  const activePanel    = useQueryStore(s => s.activePanel);
  const setActivePanel = useQueryStore(s => s.setActivePanel);
  const results        = useQueryStore(s => s.results);
  const hydrate        = useQueryStore(s => s.hydrate);

  // ── Hydrate from localStorage/cookies after first paint ─────────────────────
  // This runs only on the client, after React has committed the SSR HTML,
  // which is why it's safe — no hydration mismatch window.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ── Apply theme attribute ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); useQueryStore.getState().runQuery(); }
      if (mod && e.key === 'r')     { e.preventDefault(); useQueryStore.getState().resetQuery(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-layout">
      <Header />

      <div className="main-layout">
        <SchemaPanel />

        <div className="center-column">
          <div className="tab-bar">
            <button
              className={`tab-btn ${activePanel === 'builder' ? 'tab-btn--active' : ''}`}
              onClick={() => setActivePanel('builder')}
              data-testid="tab-builder"
            >
              <Layers size={13} /> Builder
            </button>
            <button
              className={`tab-btn ${activePanel === 'preview' ? 'tab-btn--active' : ''}`}
              onClick={() => setActivePanel('preview')}
              data-testid="tab-preview"
            >
              <Code2 size={13} /> SQL Preview
            </button>
            <button
              className={`tab-btn ${activePanel === 'results' ? 'tab-btn--active' : ''}`}
              onClick={() => setActivePanel('results')}
              data-testid="tab-results"
            >
              <Play size={13} />
              Results{results !== null ? ` (${results.length})` : ''}
            </button>
          </div>

          <div className="tab-content">
            {activePanel === 'builder' && (
              <div className="tab-pane">
                <QueryWorkspace />
              </div>
            )}
            {activePanel === 'preview' && (
              <div className="tab-pane tab-pane--preview">
                <SQLPreviewPanel />
              </div>
            )}
            {activePanel === 'results' && (
              <div className="tab-pane">
                <ResultsPanel />
              </div>
            )}
          </div>
        </div>

        <HistoryPanel />
      </div>
    </div>
  );
}
