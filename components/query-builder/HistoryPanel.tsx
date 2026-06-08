'use client';

import { Clock, Trash2, RotateCcw } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, type SchemaKey } from '@/data';
import SchemaIcon from '@/components/ui/SchemaIcon';

export default function HistoryPanel() {
  const queryHistory    = useQueryStore(s => s.queryHistory);
  const loadFromHistory = useQueryStore(s => s.loadFromHistory);
  const clearHistory    = useQueryStore(s => s.clearHistory);

  return (
    <aside className="history-panel" data-testid="history-panel">
      <div className="panel-section">
        <div className="panel-section-title" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={11} /> HISTORY
          </span>
          {queryHistory.length > 0 && (
            <button
              className="history-clear-btn"
              onClick={clearHistory}
              data-testid="clear-history-btn"
            >
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="history-list">
        {queryHistory.length === 0 && (
          <p className="empty-hint" style={{ padding: '12px 14px' }}>No queries run yet</p>
        )}

        {queryHistory.map((entry, idx) => {
          const schemaIcon = SCHEMAS[entry.schemaKey as SchemaKey]?.icon ?? 'globe';
          const whereClause = entry.sql.split('\n').slice(2).join(' ').trim();
          return (
            <button
              key={entry.id}
              className="history-row"
              onClick={() => loadFromHistory(entry)}
              data-testid={`history-entry-${entry.id}`}
            >
              <div className="history-row-top">
                <span className="history-index">#{queryHistory.length - idx}</span>
                <span className="history-time">{entry.timestamp}</span>
                <span className="history-count">{entry.resultCount} rows</span>
              </div>
              <div className="history-schema">
                <SchemaIcon icon={schemaIcon} size={11} strokeWidth={1.75} />
                <span>{entry.schemaKey}</span>
              </div>
              <div className="history-sql">
                {whereClause ? whereClause.slice(0, 70) : 'No conditions'}
                {whereClause.length > 70 ? '…' : ''}
              </div>
              <RotateCcw size={10} className="history-restore-icon" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
