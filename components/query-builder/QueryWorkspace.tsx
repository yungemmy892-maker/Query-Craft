'use client';

import { memo, useCallback } from 'react';
import React from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DraggableAttributes,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, PlusSquare, Trash2, GripVertical, ChevronRight, ChevronDown,
  AlertCircle, Layers,
} from 'lucide-react';
import { useQueryStore } from '@/store/query-store';
import { SCHEMAS, type SchemaKey } from '@/data';
import { OPERATORS_BY_TYPE, OPERATOR_LABELS } from '@/lib/operators';
import type { Group, Condition, QueryNode, SchemaField } from '@/types';

// ─── Depth colours ────────────────────────────────────────────────────────────
const DEPTH_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
const dc = (d: number) => DEPTH_COLORS[d % DEPTH_COLORS.length];

// ─── DragHandle Context ───────────────────────────────────────────────────────
interface DragHandleCtx {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}
const DragHandleContext = React.createContext<DragHandleCtx | null>(null);

// ─── Sortable Wrapper ─────────────────────────────────────────────────────────
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        zIndex: isDragging ? 10 : 'auto',
      }}
    >
      <DragHandleContext.Provider value={{ attributes, listeners }}>
        {children}
      </DragHandleContext.Provider>
    </div>
  );
}

function DragHandle() {
  const ctx = React.useContext(DragHandleContext);
  if (!ctx) return null;
  return (
    <button
      className="drag-handle"
      {...ctx.attributes}
      {...ctx.listeners}
      data-testid="drag-handle"
    >
      <GripVertical size={13} />
    </button>
  );
}

// ─── Condition Row ────────────────────────────────────────────────────────────
const ConditionRow = memo(function ConditionRow({
  node, fields, errorIds,
}: {
  node: Condition;
  fields: SchemaField[];
  depth: number;
  errorIds: Set<string>;
}) {
  const updateNode = useQueryStore(s => s.updateNode);
  const removeNode = useQueryStore(s => s.removeNode);

  const field     = fields.find(f => f.name === node.field) ?? fields[0];
  const ops       = OPERATORS_BY_TYPE[field.type] ?? ['equals'];
  const isBetween = node.operator === 'between';
  const noValue   = node.operator === 'isEmpty' || node.operator === 'isNotEmpty';
  const hasError  = errorIds.has(node.id);

  const update = useCallback(
    (patch: Partial<Condition>) =>
      updateNode(node.id, n => ({ ...n, ...patch } as QueryNode)),
    [node.id, updateNode],
  );

  return (
    <div
      className={`condition-row ${hasError ? 'condition-row--error' : ''}`}
      data-testid={`condition-${node.id}`}
    >
      <DragHandle />

      {/* Field selector */}
      <select
        className="cond-select cond-select--field"
        value={node.field}
        onChange={e => {
          const newField = fields.find(f => f.name === e.target.value)!;
          update({ field: e.target.value, operator: OPERATORS_BY_TYPE[newField.type][0], value: '', valueTo: '' });
        }}
        data-testid={`field-select-${node.id}`}
      >
        {fields.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
      </select>

      {/* Operator */}
      <select
        className="cond-select cond-select--op"
        value={node.operator}
        onChange={e => update({ operator: e.target.value as Condition['operator'], value: '', valueTo: '' })}
        data-testid={`op-select-${node.id}`}
      >
        {ops.map(op => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
      </select>

      {/* Value(s) */}
      {!noValue && (
        field.type === 'boolean' ? (
          <select
            className="cond-select cond-select--val"
            value={node.value}
            onChange={e => update({ value: e.target.value })}
            data-testid={`value-bool-${node.id}`}
          >
            <option value="">—</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : field.type === 'enum' && (node.operator === 'in' || node.operator === 'notIn') ? (
          <div className="enum-chips" data-testid={`value-enum-multi-${node.id}`}>
            {field.options?.map(opt => {
              const selected = (node.value || '').split(',').map(s => s.trim()).includes(opt);
              return (
                <button
                  key={opt}
                  className={`enum-chip ${selected ? 'enum-chip--active' : ''}`}
                  onClick={() => {
                    const current = node.value
                      ? node.value.split(',').map(s => s.trim()).filter(Boolean)
                      : [];
                    const next = selected
                      ? current.filter(s => s !== opt)
                      : [...current, opt];
                    update({ value: next.join(', ') });
                  }}
                  data-testid={`chip-${opt}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : field.type === 'enum' ? (
          <select
            className="cond-select cond-select--val"
            value={node.value}
            onChange={e => update({ value: e.target.value })}
            data-testid={`value-enum-${node.id}`}
          >
            <option value="">—</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            className="cond-input"
            type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
            value={node.value}
            onChange={e => update({ value: e.target.value })}
            placeholder="value…"
            style={{ width: isBetween ? 100 : 150 }}
            data-testid={`value-input-${node.id}`}
          />
        )
      )}

      {isBetween && (
        <>
          <span className="between-sep">and</span>
          <input
            className="cond-input"
            type={field.type === 'date' ? 'date' : 'number'}
            value={node.valueTo ?? ''}
            onChange={e => update({ valueTo: e.target.value })}
            placeholder="to…"
            style={{ width: 100 }}
            data-testid={`value-to-${node.id}`}
          />
        </>
      )}

      {hasError && <AlertCircle size={13} className="cond-error-icon" />}

      <button
        className="cond-remove"
        onClick={() => removeNode(node.id)}
        data-testid={`remove-${node.id}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
});

// ─── Group Node (recursive) ────────────────────────────────────────────────────
const GroupNode = memo(function GroupNode({
  node, fields, depth, isRoot, errorIds,
}: {
  node: Group;
  fields: SchemaField[];
  depth: number;
  isRoot: boolean;
  errorIds: Set<string>;
}) {
  const updateNode     = useQueryStore(s => s.updateNode);
  const removeNode     = useQueryStore(s => s.removeNode);
  const addCondition   = useQueryStore(s => s.addCondition);
  const addGroup       = useQueryStore(s => s.addGroup);
  const reorderNodes   = useQueryStore(s => s.reorderNodes);
  const toggleGroup    = useQueryStore(s => s.toggleGroup);
  const expandedGroups = useQueryStore(s => s.expandedGroups);

  const color      = dc(depth);
  const isExpanded = expandedGroups[node.id] !== false;
  const hasError   = errorIds.has(node.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = node.children.findIndex(c => c.id === active.id);
    const toIdx   = node.children.findIndex(c => c.id === over.id);
    if (fromIdx !== -1 && toIdx !== -1) reorderNodes(node.id, fromIdx, toIdx);
  }, [node.children, node.id, reorderNodes]);

  return (
    <div
      className={`group-node ${depth > 0 ? 'group-node--nested' : ''}`}
      style={{ '--depth-color': color } as React.CSSProperties}
      data-testid={`group-${node.id}`}
    >
      {/* Group header */}
      <div className={`group-header ${hasError ? 'group-header--error' : ''}`}>
        {!isRoot && <DragHandle />}

        <button
          className="group-collapse-btn"
          onClick={() => toggleGroup(node.id)}
          data-testid={`toggle-group-${node.id}`}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Logic toggle */}
        <div className="logic-toggle" data-testid={`logic-toggle-${node.id}`}>
          {(['AND', 'OR'] as const).map(l => (
            <button
              key={l}
              className={`logic-btn ${node.logic === l ? 'logic-btn--active' : ''}`}
              style={node.logic === l ? { background: color, borderColor: color } : {}}
              onClick={() => updateNode(node.id, n => ({ ...n, logic: l }))}
              data-testid={`logic-${l.toLowerCase()}-${node.id}`}
            >
              {l}
            </button>
          ))}
        </div>

        {isRoot && <span className="group-root-badge">ROOT</span>}
        {!isRoot && (
          <span className="group-label">
            <Layers size={11} style={{ display: 'inline', marginRight: 3 }} />
            Group
          </span>
        )}

        <div className="group-actions">
          <button
            className="group-action-btn"
            onClick={() => addCondition(node.id)}
            data-testid={`add-condition-${node.id}`}
          >
            <Plus size={12} /> Condition
          </button>
          <button
            className="group-action-btn group-action-btn--group"
            onClick={() => addGroup(node.id)}
            data-testid={`add-group-${node.id}`}
          >
            <PlusSquare size={12} /> Group
          </button>
          {!isRoot && (
            <button
              className="group-action-btn group-action-btn--remove"
              onClick={() => removeNode(node.id)}
              data-testid={`remove-group-${node.id}`}
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && node.children.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={node.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="group-children">
              {node.children.map((child, idx) => (
                <div key={child.id}>
                  {idx > 0 && (
                    <div className="logic-separator" style={{ color }}>
                      {node.logic}
                    </div>
                  )}
                  <SortableItem id={child.id}>
                    {child.type === 'group' ? (
                      <GroupNode
                        node={child as Group}
                        fields={fields}
                        depth={depth + 1}
                        isRoot={false}
                        errorIds={errorIds}
                      />
                    ) : (
                      <ConditionRow
                        node={child as Condition}
                        fields={fields}
                        depth={depth}
                        errorIds={errorIds}
                      />
                    )}
                  </SortableItem>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isExpanded && node.children.length === 0 && !isRoot && (
        <div className="group-empty">empty group — add a condition or nested group</div>
      )}
    </div>
  );
});

// ─── Workspace ─────────────────────────────────────────────────────────────────
export default function QueryWorkspace() {
  const root         = useQueryStore(s => s.root);
  const schemaKey    = useQueryStore(s => s.schemaKey);
  const validation   = useQueryStore(s => s.validation);
  const addCondition = useQueryStore(s => s.addCondition);
  const schema       = SCHEMAS[schemaKey as SchemaKey];
  const errorIds     = new Set(validation.errors.map(e => e.nodeId));

  return (
    <div className="workspace" data-testid="query-workspace">
      {/* Validation banner */}
      {!validation.valid && (
        <div className="validation-banner" data-testid="validation-banner">
          {validation.errors.map(e => (
            <div key={e.nodeId} className="validation-error">
              <AlertCircle size={12} /> {e.message}
            </div>
          ))}
        </div>
      )}

      {/* Tree */}
      <div className="workspace-tree">
        <GroupNode
          node={root}
          fields={schema.fields}
          depth={0}
          isRoot={true}
          errorIds={errorIds}
        />

        {root.children.length === 0 && (
          <div className="workspace-empty" data-testid="workspace-empty">
            <Layers size={36} className="workspace-empty-icon" strokeWidth={1} />
            <p>Click a field in the schema panel to add a condition</p>
            <p>or use the <strong>+ Condition</strong> button above</p>
            <button
              className="workspace-empty-btn"
              onClick={() => addCondition(root.id)}
              data-testid="empty-add-condition"
            >
              <Plus size={14} /> Add first condition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
