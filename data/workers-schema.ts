import type { Schema } from '@/types';

export const workersSchema: Schema = {
  key: 'workers',
  label: 'Workers',
  icon: 'briefcase',
  fields: [
    { name: 'id',         label: 'ID',           type: 'number' },
    { name: 'name',       label: 'Name',          type: 'string' },
    { name: 'department', label: 'Department',    type: 'enum', options: ['Engineering','Marketing','Sales','HR','Finance'] },
    { name: 'salary',     label: 'Salary',        type: 'number' },
    { name: 'yearsExp',   label: 'Years Exp.',    type: 'number' },
    { name: 'isRemote',   label: 'Remote',        type: 'boolean' },
    { name: 'hiredAt',    label: 'Hired At',      type: 'date' },
  ],
};
