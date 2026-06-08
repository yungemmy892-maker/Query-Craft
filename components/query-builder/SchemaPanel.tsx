'use client';

import { useState } from 'react';
import { Plus, Save, Trash2, Database, ChevronDown } from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, DATASETS, type SchemaKey } from '@/data';
import SchemaIcon from '@/components/ui/SchemaIcon';

const TYPE_COLORS: Record<string, string> = {
  string:  'var(--type-string)',
  number:  'var(--type-number)',
  enum:    'var(--type-enum)',
  date:    'var(--type-date)',
  boolean: 'var(--type-boolean)',
};

export default function SchemaPanel() {
  const schemaKey    = useQueryStore(s => s.schemaKey);
  const root         = useQueryStore(s => s.root);
  const addCondition = useQueryStore(s => s.addCondition);
  const savedPresets = useQueryStore(s => s.savedPresets);
  const savePreset   = useQueryStore(s => s.savePreset);
  const loadPreset   = useQueryStore(s => s.loadPreset);
  const deletePreset = useQueryStore(s => s.deletePreset);

  const schema  = SCHEMAS[schemaKey as SchemaKey];
  const dataset = DATASETS[schemaKey];

  const [presetName, setPresetName]   = useState('');
  const [presetsOpen, setPresetsOpen] = useState(true);

  const handleSave = () => {
    if (!presetName.trim()) return;
    savePreset(presetName.trim());
    setPresetName('');
  };

  return (
    <aside className="schema-panel" data-testid="schema-panel">
      {/* Schema info */}
      <div className="panel-section">
        <div className="panel-section-title">
          <Database size={11} />
          SCHEMA · {schemaKey.toUpperCase()}
        </div>
        <div className="schema-meta">
          <span>{dataset.length} records</span>
          <span>·</span>
          <span>{schema.fields.length} fields</span>
        </div>
      </div>

      {/* Fields */}
      <div className="field-list">
        {schema.fields.map(field => (
          <button
            key={field.name}
            className="field-row"
            onClick={() => addCondition(root.id, field.name)}
            title={`Add condition for ${field.label}`}
            data-testid={`field-${field.name}`}
          >
            <span className="field-name">{field.label}</span>
            <span className="field-badge" style={{ color: TYPE_COLORS[field.type] }}>
              {field.type}
            </span>
            <Plus size={11} className="field-plus" />
          </button>
        ))}
      </div>

      {/* Presets */}
      <div className="panel-section presets-section">
        <button
          className="panel-section-title panel-section-title--btn"
          onClick={() => setPresetsOpen(o => !o)}
        >
          <span>PRESETS</span>
          <ChevronDown
            size={12}
            style={{ transform: presetsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </button>

        {presetsOpen && (
          <>
            <div className="preset-save">
              <input
                className="preset-input"
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Preset name…"
                data-testid="preset-name-input"
              />
              <button className="preset-save-btn" onClick={handleSave} data-testid="save-preset-btn">
                <Save size={12} />
              </button>
            </div>

            <div className="preset-list">
              {savedPresets.length === 0 && (
                <p className="empty-hint">No presets yet</p>
              )}
              {savedPresets.map(p => (
                <div key={p.id} className="preset-row" data-testid={`preset-${p.id}`}>
                  <button
                    className="preset-load-btn"
                    onClick={() => loadPreset(p)}
                    title={p.sql}
                  >
                    <SchemaIcon
                      icon={SCHEMAS[p.schemaKey as SchemaKey]?.icon ?? 'globe'}
                      size={12}
                      strokeWidth={1.75}
                      className="preset-schema-icon"
                    />
                    <span className="preset-name">{p.name}</span>
                  </button>
                  <button className="preset-delete-btn" onClick={() => deletePreset(p.id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
