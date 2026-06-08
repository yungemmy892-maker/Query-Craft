import type { Schema } from '@/types';

export const citiesSchema: Schema = {
  key: 'cities',
  label: 'Cities',
  icon: 'globe',
  fields: [
    { name: 'id',           label: 'ID',               type: 'number' },
    { name: 'name',         label: 'City',              type: 'string' },
    { name: 'continent',    label: 'Continent',         type: 'enum', options: ['Africa','Asia','Europe','Americas','Oceania'] },
    { name: 'population',   label: 'Population (M)',    type: 'number' },
    { name: 'gdpPerCapita', label: 'GDP/Capita ($)',    type: 'number' },
    { name: 'isCoastal',    label: 'Coastal',           type: 'boolean' },
  ],
};
