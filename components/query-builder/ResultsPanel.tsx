'use client';

import { Download, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, type SchemaKey } from '@/data';

export default function ResultsPanel() {
  const results   = useQueryStore(s => s.results);
  const schemaKey = useQueryStore(s => s.schemaKey);
  const isRunning = useQueryStore(s => s.isRunning);
  const runQuery  = useQueryStore(s => s.runQuery);
  const exportCSV = useQueryStore(s => s.exportCSV);
  const schema    = SCHEMAS[schemaKey as SchemaKey];

  if (isRunning) {
    return (
      <div className="results-empty" data-testid="results-loading">
        <div className="results-spinner" />
        <p>Running query…</p>
      </div>
    );
  }

  if (results === null) {
    return (
      <div className="results-empty" data-testid="results-idle">
        <Play size={36} className="results-empty-icon" />
        <p>Run a query to see results</p>
        <button className="workspace-empty-btn" onClick={runQuery}>
          <Play size={13} /> Run Query
        </button>
      </div>
    );
  }

  return (
    <div className="results-panel" data-testid="results-panel">
      {/* Header */}
      <div className="results-header">
        <div className="results-count" data-testid="results-count">
          {results.length > 0 ? (
            <>
              <CheckCircle2 size={14} className="results-count-icon--ok" />
              {results.length} record{results.length !== 1 ? 's' : ''} matched
            </>
          ) : (
            <>
              <XCircle size={14} className="results-count-icon--zero" />
              No records matched
            </>
          )}
        </div>
        {results.length > 0 && (
          <button
            className="results-export-btn"
            onClick={exportCSV}
            data-testid="export-csv-btn"
          >
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      {results.length > 0 ? (
        <div className="results-table-wrap">
          <table className="results-table" data-testid="results-table">
            <thead>
              <tr>
                {schema.fields.map(f => (
                  <th key={f.name} data-testid={`th-${f.name}`}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i} data-testid={`result-row-${i}`}>
                  {schema.fields.map(f => {
                    const val = row[f.name];
                    return (
                      <td key={f.name} data-testid={`cell-${f.name}-${i}`}>
                        {f.type === 'boolean' ? (
                          <span className={val ? 'cell-bool-true' : 'cell-bool-false'}>
                            {val ? (
                              <><CheckCircle2 size={12} style={{ display: 'inline', marginRight: 3 }} />true</>
                            ) : (
                              <><XCircle size={12} style={{ display: 'inline', marginRight: 3 }} />false</>
                            )}
                          </span>
                        ) : (
                          String(val ?? '—')
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="results-no-match" data-testid="results-no-match">
          <XCircle size={32} />
          <p>No records match the current query</p>
        </div>
      )}
    </div>
  );
}
