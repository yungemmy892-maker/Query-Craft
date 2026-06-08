import type { Schema } from '@/types';

export const ordersSchema: Schema = {
  key: 'orders',
  label: 'Orders',
  icon: 'shopping-cart',
  fields: [
    { name: 'id',         label: 'Order ID',    type: 'number' },
    { name: 'userId',     label: 'User ID',     type: 'number' },
    { name: 'total',      label: 'Total ($)',   type: 'number' },
    { name: 'status',     label: 'Status',      type: 'enum', options: ['pending','processing','shipped','delivered','cancelled'] },
    { name: 'itemCount',  label: 'Item Count',  type: 'number' },
    { name: 'isPriority', label: 'Priority',    type: 'boolean' },
    { name: 'createdAt',  label: 'Order Date',  type: 'date' },
  ],
};
