// ─── Field Types ──────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'enum' | 'date' | 'boolean';

export interface SchemaField {
  name: string;
  label: string;
  type: FieldType;
  options?: string[]; // for enum type
}

export interface Schema {
  key: string;
  label: string;
  icon: string;
  fields: SchemaField[];
}

// ─── Query Tree ───────────────────────────────────────────────────────────────

export type LogicOperator = 'AND' | 'OR';

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'between'
  | 'in'
  | 'notIn'
  | 'regex';

export interface Condition {
  id: string;
  type: 'condition';
  field: string;
  operator: ConditionOperator;
  value: string;
  valueTo?: string; // used for 'between'
}

export interface Group {
  id: string;
  type: 'group';
  logic: LogicOperator;
  children: QueryNode[];
  collapsed?: boolean;
}

export type QueryNode = Condition | Group;

// ─── Top-level Query ─────────────────────────────────────────────────────────

export interface Query {
  id: string;
  schemaKey: string;
  root: Group;
  createdAt: string;
  name?: string;
}

// ─── Preset / History ─────────────────────────────────────────────────────────

export interface QueryPreset {
  id: string;
  name: string;
  schemaKey: string;
  root: Group;
  sql: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  schemaKey: string;
  root: Group;
  sql: string;
  resultCount: number;
  timestamp: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  nodeId: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
