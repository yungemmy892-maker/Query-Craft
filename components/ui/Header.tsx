'use client';

import { Sun, Moon, Download, Upload, RotateCcw, Play, Hexagon } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, type SchemaKey } from '@/data';
import SchemaIcon from '@/components/ui/SchemaIcon';
import { useRef } from 'react';

export default function Header() {
  const schemaKey   = useQueryStore(s => s.schemaKey);
  const isDarkMode  = useQueryStore(s => s.isDarkMode);
  const isRunning   = useQueryStore(s => s.isRunning);
  const setSchema   = useQueryStore(s => s.setSchema);
  const setDarkMode = useQueryStore(s => s.setDarkMode);
  const runQuery    = useQueryStore(s => s.runQuery);
  const resetQuery  = useQueryStore(s => s.resetQuery);
  const exportJSON  = useQueryStore(s => s.exportJSON);
  const importJSON  = useQueryStore(s => s.importJSON);
  const fileRef     = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => importJSON(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="header">
      {/* Brand */}
      <div className="brand">
        <Hexagon size={20} className="brand-icon" strokeWidth={1.5} />
        <span className="brand-name">QueryCraft</span>
        <span className="brand-badge">VISUAL BUILDER</span>
      </div>

      {/* Schema tabs */}
      <nav className="schema-nav">
        {(Object.keys(SCHEMAS) as SchemaKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSchema(key)}
            className={`schema-tab ${schemaKey === key ? 'schema-tab--active' : ''}`}
            data-testid={`schema-tab-${key}`}
          >
            <SchemaIcon icon={SCHEMAS[key].icon} size={13} strokeWidth={1.75} />
            <span>{SCHEMAS[key].label}</span>
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="header-actions">
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />

        <button className="hdr-btn" onClick={() => fileRef.current?.click()} title="Import JSON" data-testid="import-btn">
          <Upload size={13} />
          <span>Import</span>
        </button>

        <button className="hdr-btn" onClick={exportJSON} title="Export JSON" data-testid="export-btn">
          <Download size={13} />
          <span>Export</span>
        </button>

        <button className="hdr-btn hdr-btn--danger" onClick={resetQuery} title="Reset query" data-testid="reset-btn">
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <button
          className={`hdr-btn hdr-btn--run ${isRunning ? 'hdr-btn--running' : ''}`}
          onClick={runQuery}
          disabled={isRunning}
          data-testid="run-query-btn"
        >
          <Play size={13} />
          <span>{isRunning ? 'Running…' : 'Run Query'}</span>
        </button>

        <button className="hdr-btn hdr-btn--icon" onClick={() => setDarkMode(!isDarkMode)} title="Toggle theme">
          {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
