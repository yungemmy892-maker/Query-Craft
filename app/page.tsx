'use client';

import { useEffect, useState, useCallback } from 'react';
import { Layers, Code2, Play } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import Header from '@/components/ui/Header';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
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

  // Drawer state for mobile
  const [schemaOpen,  setSchemaOpen]  = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const closeAll        = useCallback(() => { setSchemaOpen(false); setHistoryOpen(false); }, []);
  const toggleSchema    = useCallback(() => { setSchemaOpen(o => !o); setHistoryOpen(false); }, []);
  const toggleHistory   = useCallback(() => { setHistoryOpen(o => !o); setSchemaOpen(false); }, []);

  // Close drawers on route change / panel switch
  const handleSetPanel = useCallback((p: 'builder' | 'preview' | 'results') => {
    setActivePanel(p);
    closeAll();
  }, [setActivePanel, closeAll]);

  // ── Hydrate from localStorage/cookies after first paint ──────────────────────
  useEffect(() => { hydrate(); }, [hydrate]);

  // ── Theme ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') { e.preventDefault(); useQueryStore.getState().runQuery(); }
      if (mod && e.key === 'r')     { e.preventDefault(); useQueryStore.getState().resetQuery(); }
      if (e.key === 'Escape')       { closeAll(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeAll]);

  // ── Show mobile buttons via JS (avoids SSR/CSS ordering issues) ──────────────
  useEffect(() => {
    const mobileBtns = document.querySelectorAll<HTMLElement>('[data-mobile-btn]');
    const mq = window.matchMedia('(max-width: 768px)');
    const apply = () => mobileBtns.forEach(b => {
      b.style.display = mq.matches ? 'flex' : 'none';
    });
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const anyDrawerOpen = schemaOpen || historyOpen;

  return (
    <div className="app-layout">
      <Header
        onToggleSchema={toggleSchema}
        onToggleHistory={toggleHistory}
        schemaOpen={schemaOpen}
        historyOpen={historyOpen}
      />

      <div className="main-layout">
        {/* Left panel / mobile drawer */}
        <SchemaPanel mobileOpen={schemaOpen} />

        {/* Center */}
        <div className="center-column">
          <div className="tab-bar">
            <button
              className={`tab-btn ${activePanel === 'builder' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSetPanel('builder')}
              data-testid="tab-builder"
            >
              <Layers size={13} /> Builder
            </button>
            <button
              className={`tab-btn ${activePanel === 'preview' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSetPanel('preview')}
              data-testid="tab-preview"
            >
              <Code2 size={13} /> SQL Preview
            </button>
            <button
              className={`tab-btn ${activePanel === 'results' ? 'tab-btn--active' : ''}`}
              onClick={() => handleSetPanel('results')}
              data-testid="tab-results"
            >
              <Play size={13} />
              Results{results !== null ? ` (${results.length})` : ''}
            </button>
          </div>

          <div className="tab-content">
            {activePanel === 'builder' && (
              <div className="tab-pane"><QueryWorkspace /></div>
            )}
            {activePanel === 'preview' && (
              <div className="tab-pane tab-pane--preview"><SQLPreviewPanel /></div>
            )}
            {activePanel === 'results' && (
              <div className="tab-pane"><ResultsPanel /></div>
            )}
          </div>
        </div>

        {/* Right panel / mobile drawer */}
        <HistoryPanel mobileOpen={historyOpen} />
      </div>

      {/* Overlay — closes drawers when tapping outside */}
      <div
        className={`drawer-overlay ${anyDrawerOpen ? 'drawer-overlay--visible' : ''}`}
        onClick={closeAll}
        aria-hidden="true"
      />

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        onToggleSchema={toggleSchema}
        onToggleHistory={toggleHistory}
        schemaOpen={schemaOpen}
        historyOpen={historyOpen}
      />
    </div>
  );
}
