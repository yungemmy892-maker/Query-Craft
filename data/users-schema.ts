import type { Schema } from '@/types';

export const usersSchema: Schema = {
  key: 'users',
  label: 'Users',
  icon: 'users',
  fields: [
    { name: 'id',        label: 'ID',         type: 'number' },
    { name: 'name',      label: 'Name',        type: 'string' },
    { name: 'age',       label: 'Age',         type: 'number' },
    { name: 'email',     label: 'Email',       type: 'string' },
    { name: 'country',   label: 'Country',     type: 'enum',  options: ['Nigeria','USA','UK','Canada','Germany','France'] },
    { name: 'status',    label: 'Status',      type: 'enum',  options: ['active','inactive','suspended'] },
    { name: 'purchases', label: 'Purchases',   type: 'number' },
    { name: 'createdAt', label: 'Created At',  type: 'date' },
    { name: 'verified',  label: 'Verified',    type: 'boolean' },
  ],
};
