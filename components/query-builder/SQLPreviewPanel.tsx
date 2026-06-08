'use client';

import { useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','AND','OR','NOT','LIKE','BETWEEN',
  'IN','IS','NULL','AS','ORDER','BY','LIMIT','GROUP','HAVING',
  'DISTINCT','REGEXP',
]);

function highlightSQL(sql: string): React.ReactNode[] {
  const tokens = sql.split(/(\s+|[(),]|'[^']*'|\b\d+\.?\d*\b)/);
  return tokens.map((token, i) => {
    const upper = token.trim().toUpperCase();
    if (SQL_KEYWORDS.has(upper)) {
      return <span key={i} className="sql-keyword">{token}</span>;
    }
    if (token.startsWith("'") && token.endsWith("'")) {
      return <span key={i} className="sql-string">{token}</span>;
    }
    if (/^\d+\.?\d*$/.test(token.trim()) && token.trim() !== '') {
      return <span key={i} className="sql-number">{token}</span>;
    }
    if (['=','!=','<','>','<=','>='].includes(token.trim())) {
      return <span key={i} className="sql-op">{token}</span>;
    }
    return <span key={i}>{token}</span>;
  });
}

export default function SQLPreviewPanel() {
  const queryPreview = useQueryStore(s => s.queryPreview);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(queryPreview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <div className="preview-header">
        <Code2 size={13} style={{ color: 'var(--accent)' }} />
        <span className="preview-label">SQL-LIKE PREVIEW</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Updates in real-time as you build
        </span>
        <button className="preview-copy-btn" onClick={handleCopy} data-testid="copy-sql-btn">
          {copied
            ? <><Check size={12} /> Copied!</>
            : <><Copy size={12} /> Copy</>
          }
        </button>
      </div>
      <pre className="preview-code" data-testid="sql-preview">
        {highlightSQL(queryPreview)}
      </pre>
    </>
  );
}
