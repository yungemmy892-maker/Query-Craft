import { describe, it, expect } from 'vitest';
import { executeQuery, generateQueryPreview, validateQuery } from '../query-engine';
import type { Group, Condition } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cond(field: string, operator: Condition['operator'], value: string, valueTo?: string): Condition {
  return { id: 'c-' + field, type: 'condition', field, operator, value, valueTo };
}

function group(logic: 'AND' | 'OR', children: (Group | Condition)[]): Group {
  return { id: 'g-' + Math.random(), type: 'group', logic, children };
}

// ─── Sample dataset ───────────────────────────────────────────────────────────
const dataset = [
  { id: 1, name: 'Alice',   age: 25, country: 'Nigeria', status: 'active',   verified: true  },
  { id: 2, name: 'Bob',     age: 17, country: 'USA',     status: 'inactive', verified: false },
  { id: 3, name: 'Charlie', age: 32, country: 'Nigeria', status: 'active',   verified: true  },
  { id: 4, name: 'Diana',   age: 28, country: 'UK',      status: 'suspended',verified: false },
  { id: 5, name: 'Eve',     age: 19, country: 'Nigeria', status: 'active',   verified: true  },
];

const fields = [
  { name: 'id',       label: 'ID',      type: 'number'  as const },
  { name: 'name',     label: 'Name',    type: 'string'  as const },
  { name: 'age',      label: 'Age',     type: 'number'  as const },
  { name: 'country',  label: 'Country', type: 'enum'    as const, options: ['Nigeria','USA','UK'] },
  { name: 'status',   label: 'Status',  type: 'enum'    as const, options: ['active','inactive','suspended'] },
  { name: 'verified', label: 'Verified',type: 'boolean' as const },
];

// ─── executeQuery ──────────────────────────────────────────────────────────────
describe('executeQuery', () => {
  it('returns all records for an empty root group', () => {
    const root = group('AND', []);
    expect(executeQuery(root, dataset)).toHaveLength(dataset.length);
  });

  it('filters by string equality', () => {
    const root = group('AND', [cond('country', 'equals', 'Nigeria')]);
    expect(executeQuery(root, dataset)).toHaveLength(3);
  });

  it('filters by number greaterThan', () => {
    const root = group('AND', [cond('age', 'greaterThan', '20')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => (r.age as number) > 20)).toBe(true);
  });

  it('filters by number lessThan', () => {
    const root = group('AND', [cond('age', 'lessThan', '20')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => (r.age as number) < 20)).toBe(true);
  });

  it('filters by between', () => {
    const root = group('AND', [cond('age', 'between', '18', '30')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => (r.age as number) >= 18 && (r.age as number) <= 30)).toBe(true);
  });

  it('AND logic: both conditions must match', () => {
    const root = group('AND', [
      cond('country', 'equals', 'Nigeria'),
      cond('status', 'equals', 'active'),
    ]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => r.country === 'Nigeria' && r.status === 'active')).toBe(true);
  });

  it('OR logic: at least one condition must match', () => {
    const root = group('OR', [
      cond('country', 'equals', 'USA'),
      cond('country', 'equals', 'UK'),
    ]);
    const result = executeQuery(root, dataset);
    expect(result).toHaveLength(2);
  });

  it('handles nested groups', () => {
    const nested = group('OR', [
      cond('country', 'equals', 'USA'),
      cond('country', 'equals', 'UK'),
    ]);
    const root = group('AND', [
      nested,
      cond('verified', 'equals', 'false'),
    ]);
    const result = executeQuery(root, dataset);
    // Bob(USA,false) and Diana(UK,false)
    expect(result).toHaveLength(2);
  });

  it('handles contains operator', () => {
    const root = group('AND', [cond('name', 'contains', 'li')]);
    const result = executeQuery(root, dataset);
    expect(result.map(r => r.name)).toContain('Alice');
    expect(result.map(r => r.name)).toContain('Charlie');
  });

  it('handles startsWith operator', () => {
    const root = group('AND', [cond('name', 'startsWith', 'A')]);
    const result = executeQuery(root, dataset);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('handles in operator', () => {
    const root = group('AND', [cond('status', 'in', 'active, suspended')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => r.status === 'active' || r.status === 'suspended')).toBe(true);
  });

  it('handles notIn operator', () => {
    const root = group('AND', [cond('status', 'notIn', 'inactive, suspended')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => r.status === 'active')).toBe(true);
  });

  it('handles isEmpty operator', () => {
    const data = [{ id: 1, name: '' }, { id: 2, name: 'Bob' }];
    const root = group('AND', [cond('name', 'isEmpty', '')]);
    expect(executeQuery(root, data)).toHaveLength(1);
  });

  it('handles boolean equals', () => {
    const root = group('AND', [cond('verified', 'equals', 'true')]);
    const result = executeQuery(root, dataset);
    expect(result.every(r => r.verified === true)).toBe(true);
  });
});

// ─── generateQueryPreview ─────────────────────────────────────────────────────
describe('generateQueryPreview', () => {
  it('returns SELECT * FROM schema for empty root', () => {
    const root = group('AND', []);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toBe('SELECT *\nFROM users');
  });

  it('includes WHERE clause for single condition', () => {
    const root = group('AND', [cond('age', 'greaterThan', '18')]);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toContain('WHERE');
    expect(sql).toContain('Age > 18');
  });

  it('joins multiple conditions with AND', () => {
    const root = group('AND', [
      cond('country', 'equals', 'Nigeria'),
      cond('status', 'equals', 'active'),
    ]);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toContain('AND');
  });

  it('generates LIKE for contains', () => {
    const root = group('AND', [cond('name', 'contains', 'Alice')]);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toContain("LIKE '%Alice%'");
  });

  it('generates BETWEEN for between operator', () => {
    const root = group('AND', [cond('age', 'between', '18', '30')]);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toContain('BETWEEN 18 AND 30');
  });

  it('generates IN for in operator', () => {
    const root = group('AND', [cond('status', 'in', 'active, inactive')]);
    const sql = generateQueryPreview(root, 'users', fields);
    expect(sql).toContain('IN (');
  });
});

// ─── validateQuery ────────────────────────────────────────────────────────────
describe('validateQuery', () => {
  it('passes for an empty root', () => {
    const root = group('AND', []);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(true);
  });

  it('fails for condition with missing value', () => {
    const root = group('AND', [cond('age', 'greaterThan', '')]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('fails for condition with unknown field', () => {
    const root = group('AND', [cond('nonexistent', 'equals', 'foo')]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(false);
  });

  it('passes for isEmpty (no value required)', () => {
    const root = group('AND', [cond('name', 'isEmpty', '')]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(true);
  });

  it('fails for between with missing valueTo', () => {
    const c = cond('age', 'between', '18');
    const root = group('AND', [c]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(false);
  });

  it('fails for between where from > to', () => {
    const root = group('AND', [cond('age', 'between', '50', '10')]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(false);
  });

  it('validates nested groups recursively', () => {
    const nested = group('OR', [cond('age', 'equals', '')]);
    const root = group('AND', [nested]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(false);
  });

  it('passes for valid nested groups', () => {
    const nested = group('OR', [
      cond('country', 'equals', 'Nigeria'),
      cond('country', 'equals', 'USA'),
    ]);
    const root = group('AND', [nested]);
    const result = validateQuery(root, fields);
    expect(result.valid).toBe(true);
  });
});
