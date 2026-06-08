import type { Group, Condition, QueryNode, SchemaField, ValidationResult, ValidationError } from '@/types';

// ─── Condition Evaluator ──────────────────────────────────────────────────────

function evaluateCondition(condition: Condition, record: Record<string, unknown>): boolean {
  const { field, operator, value, valueTo } = condition;
  const raw = record[field];
  if (raw === undefined || raw === null) {
    if (operator === 'isEmpty') return true;
    if (operator === 'isNotEmpty') return false;
    return false;
  }

  const recStr = String(raw).toLowerCase();
  const valStr = String(value).toLowerCase();

  switch (operator) {
    case 'equals':             return recStr === valStr;
    case 'notEquals':          return recStr !== valStr;
    case 'contains':           return recStr.includes(valStr);
    case 'startsWith':         return recStr.startsWith(valStr);
    case 'endsWith':           return recStr.endsWith(valStr);
    case 'isEmpty':            return String(raw).trim() === '';
    case 'isNotEmpty':         return String(raw).trim() !== '';
    case 'greaterThan':        return Number(raw) > Number(value);
    case 'lessThan':           return Number(raw) < Number(value);
    case 'greaterThanOrEqual': return Number(raw) >= Number(value);
    case 'lessThanOrEqual':    return Number(raw) <= Number(value);
    case 'between':            return Number(raw) >= Number(value) && Number(raw) <= Number(valueTo ?? value);
    case 'in': {
      const list = String(value).split(',').map(s => s.trim().toLowerCase());
      return list.includes(recStr);
    }
    case 'notIn': {
      const list = String(value).split(',').map(s => s.trim().toLowerCase());
      return !list.includes(recStr);
    }
    case 'regex': {
      try { return new RegExp(value, 'i').test(String(raw)); }
      catch { return false; }
    }
    default: return false;
  }
}

// ─── Group Evaluator ─────────────────────────────────────────────────────────

export function evaluateGroup(group: Group, record: Record<string, unknown>): boolean {
  if (!group.children || group.children.length === 0) return true;
  const method = group.logic === 'AND' ? 'every' : 'some';
  return group.children[method]((child: QueryNode) =>
    child.type === 'group'
      ? evaluateGroup(child as Group, record)
      : evaluateCondition(child as Condition, record)
  );
}

// ─── Query Executor ───────────────────────────────────────────────────────────

export function executeQuery(
  group: Group,
  dataset: Record<string, unknown>[]
): Record<string, unknown>[] {
  return dataset.filter(record => evaluateGroup(group, record));
}

// ─── SQL Preview Generator ───────────────────────────────────────────────────

function conditionToSQL(cond: Condition, fields: SchemaField[]): string {
  const field = fields.find(f => f.name === cond.field);
  if (!field) return '';
  const label = field.label;
  const isStr = field.type === 'string' || field.type === 'enum' || field.type === 'date';
  const wrap = (v: string) => isStr ? `'${v}'` : v;

  switch (cond.operator) {
    case 'equals':             return `${label} = ${wrap(cond.value)}`;
    case 'notEquals':          return `${label} != ${wrap(cond.value)}`;
    case 'contains':           return `${label} LIKE '%${cond.value}%'`;
    case 'startsWith':         return `${label} LIKE '${cond.value}%'`;
    case 'endsWith':           return `${label} LIKE '%${cond.value}'`;
    case 'isEmpty':            return `${label} IS NULL`;
    case 'isNotEmpty':         return `${label} IS NOT NULL`;
    case 'greaterThan':        return `${label} > ${cond.value}`;
    case 'lessThan':           return `${label} < ${cond.value}`;
    case 'greaterThanOrEqual': return `${label} >= ${cond.value}`;
    case 'lessThanOrEqual':    return `${label} <= ${cond.value}`;
    case 'between':            return `${label} BETWEEN ${cond.value} AND ${cond.valueTo}`;
    case 'in': {
      const list = cond.value.split(',').map(v => wrap(v.trim())).join(', ');
      return `${label} IN (${list})`;
    }
    case 'notIn': {
      const list = cond.value.split(',').map(v => wrap(v.trim())).join(', ');
      return `${label} NOT IN (${list})`;
    }
    case 'regex':              return `${label} REGEXP '${cond.value}'`;
    default: return '';
  }
}

function groupToSQL(group: Group, fields: SchemaField[], depth = 0): string {
  if (!group.children || group.children.length === 0) return '';
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  const parts = group.children
    .map(child =>
      child.type === 'group'
        ? groupToSQL(child as Group, fields, depth + 1)
        : conditionToSQL(child as Condition, fields)
    )
    .filter(Boolean);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const sep = `\n${childIndent}${group.logic} `;
  const joined = parts.join(sep);
  return depth > 0
    ? `(\n${childIndent}${joined}\n${indent})`
    : joined;
}

export function generateQueryPreview(group: Group, schemaName: string, fields: SchemaField[]): string {
  const where = groupToSQL(group, fields, 0);
  if (!where) return `SELECT *\nFROM ${schemaName}`;
  return `SELECT *\nFROM ${schemaName}\nWHERE ${where}`;
}

// ─── Validator ────────────────────────────────────────────────────────────────

export function validateQuery(group: Group, fields: SchemaField[], isRoot = true): ValidationResult {
  const errors: ValidationError[] = [];
  const fieldNames = new Set(fields.map(f => f.name));

  let isFirstCall = true;
  function validate(node: QueryNode) {
    const isRootGroup = isFirstCall;
    isFirstCall = false;
    if (node.type === 'group') {
      if (!node.children || node.children.length === 0) {
        if (!isRootGroup) {
          errors.push({ nodeId: node.id, message: 'Group is empty — add at least one condition.' });
        }
      } else {
        node.children.forEach(validate);
      }
    } else {
      const cond = node as Condition;
      if (!fieldNames.has(cond.field)) {
        errors.push({ nodeId: cond.id, message: `Unknown field: "${cond.field}"` });
      }
      if (cond.operator !== 'isEmpty' && cond.operator !== 'isNotEmpty') {
        if (!cond.value && cond.value !== '0') {
          errors.push({ nodeId: cond.id, message: 'Value is required.' });
        }
        if (cond.operator === 'between' && (!cond.valueTo && cond.valueTo !== '0')) {
          errors.push({ nodeId: cond.id, message: '"Between" requires a second value.' });
        }
        if (cond.operator === 'between') {
          if (Number(cond.value) > Number(cond.valueTo)) {
            errors.push({ nodeId: cond.id, message: '"From" must be less than "To".' });
          }
        }
        if (cond.operator === 'regex') {
          try { new RegExp(cond.value); }
          catch { errors.push({ nodeId: cond.id, message: 'Invalid regular expression.' }); }
        }
      }
    }
  }

  validate(group);
  return { valid: errors.length === 0, errors };
}
