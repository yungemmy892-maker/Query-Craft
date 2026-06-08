import type { FieldType, ConditionOperator } from '@/types';

export const OPERATORS_BY_TYPE: Record<FieldType, ConditionOperator[]> = {
  string:  ['equals','notEquals','contains','startsWith','endsWith','isEmpty','isNotEmpty','in','notIn','regex'],
  number:  ['equals','notEquals','greaterThan','lessThan','greaterThanOrEqual','lessThanOrEqual','between','in','notIn'],
  enum:    ['equals','notEquals','in','notIn'],
  date:    ['equals','greaterThan','lessThan','between'],
  boolean: ['equals','notEquals'],
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals:             'equals',
  notEquals:          'not equals',
  contains:           'contains',
  startsWith:         'starts with',
  endsWith:           'ends with',
  isEmpty:            'is empty',
  isNotEmpty:         'is not empty',
  greaterThan:        'greater than',
  lessThan:           'less than',
  greaterThanOrEqual: 'at least',
  lessThanOrEqual:    'at most',
  between:            'between',
  in:                 'in list',
  notIn:              'not in list',
  regex:              'matches regex',
};

export const OPERATOR_SHORT: Record<ConditionOperator, string> = {
  equals:             '=',
  notEquals:          '!=',
  contains:           'contains',
  startsWith:         'starts with',
  endsWith:           'ends with',
  isEmpty:            'is empty',
  isNotEmpty:         'not empty',
  greaterThan:        '>',
  lessThan:           '<',
  greaterThanOrEqual: '>=',
  lessThanOrEqual:    '<=',
  between:            'between',
  in:                 'in',
  notIn:              'not in',
  regex:              'regex',
};
