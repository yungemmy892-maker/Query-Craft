import type { Schema } from '@/types';

export const productsSchema: Schema = {
  key: 'products',
  label: 'Products',
  icon: 'package',
  fields: [
    { name: 'id',        label: 'ID',          type: 'number' },
    { name: 'name',      label: 'Name',         type: 'string' },
    { name: 'category',  label: 'Category',     type: 'enum', options: ['Electronics','Clothing','Food','Books','Sports'] },
    { name: 'price',     label: 'Price',        type: 'number' },
    { name: 'stock',     label: 'Stock',        type: 'number' },
    { name: 'rating',    label: 'Rating',       type: 'number' },
    { name: 'inStock',   label: 'In Stock',     type: 'boolean' },
    { name: 'createdAt', label: 'Created At',   type: 'date' },
  ],
};
