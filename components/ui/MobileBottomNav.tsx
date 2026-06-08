'use client';

import {
  Layers, Code2, Play, Users, Package, ShoppingCart, Briefcase, Globe,
  PanelLeft, Clock,
} from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, type SchemaKey } from '@/data';
import SchemaIcon from '@/components/ui/SchemaIcon';

interface MobileBottomNavProps {
  onToggleSchema:  () => void;
  onToggleHistory: () => void;
  schemaOpen:      boolean;
  historyOpen:     boolean;
}

export default function MobileBottomNav({
  onToggleSchema, onToggleHistory, schemaOpen, historyOpen,
}: MobileBottomNavProps) {
  const activePanel    = useQueryStore(s => s.activePanel);
  const setActivePanel = useQueryStore(s => s.setActivePanel);
  const results        = useQueryStore(s => s.results);
  const isRunning      = useQueryStore(s => s.isRunning);
  const runQuery       = useQueryStore(s => s.runQuery);
  const schemaKey      = useQueryStore(s => s.schemaKey);

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">

      {/* Schema drawer */}
      <button
        className={`mobile-nav-btn ${schemaOpen ? 'mobile-nav-btn--active' : ''}`}
        onClick={onToggleSchema}
        aria-label="Toggle schema panel"
      >
        <SchemaIcon icon={SCHEMAS[schemaKey as SchemaKey].icon} size={18} strokeWidth={1.75} />
        <span>Schema</span>
      </button>

      {/* Builder tab */}
      <button
        className={`mobile-nav-btn ${activePanel === 'builder' && !schemaOpen && !historyOpen ? 'mobile-nav-btn--active' : ''}`}
        onClick={() => { setActivePanel('builder'); }}
      >
        <Layers size={18} strokeWidth={1.75} />
        <span>Builder</span>
      </button>

      {/* Run */}
      <button
        className={`mobile-nav-btn mobile-nav-btn--run ${isRunning ? 'mobile-nav-btn--active' : ''}`}
        onClick={runQuery}
        disabled={isRunning}
        aria-label="Run query"
      >
        <Play size={20} strokeWidth={2} />
        <span>{isRunning ? 'Running' : 'Run'}</span>
      </button>

      {/* Results tab */}
      <button
        className={`mobile-nav-btn ${activePanel === 'results' && !schemaOpen && !historyOpen ? 'mobile-nav-btn--active' : ''}`}
        onClick={() => setActivePanel('results')}
      >
        <Code2 size={18} strokeWidth={1.75} />
        {results !== null ? (
          <span className="mobile-nav-badge">{results.length}</span>
        ) : (
          <span>Results</span>
        )}
      </button>

      {/* History drawer */}
      <button
        className={`mobile-nav-btn ${historyOpen ? 'mobile-nav-btn--active' : ''}`}
        onClick={onToggleHistory}
        aria-label="Toggle history panel"
      >
        <Clock size={18} strokeWidth={1.75} />
        <span>History</span>
      </button>
    </nav>
  );
}
