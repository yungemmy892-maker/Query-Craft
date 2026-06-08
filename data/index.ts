import { usersSchema }    from './users-schema';
import { usersDataset }   from './users-dataset';
import { productsSchema } from './products-schema';
import { productsDataset }from './products-dataset';
import { ordersSchema }   from './orders-schema';
import { ordersDataset }  from './orders-dataset';
import { workersSchema }  from './workers-schema';
import { workersDataset } from './workers-dataset';
import { citiesSchema }   from './cities-schema';
import { citiesDataset }  from './cities-dataset';

export const SCHEMAS = {
  users:    usersSchema,
  products: productsSchema,
  orders:   ordersSchema,
  workers:  workersSchema,
  cities:   citiesSchema,
};

export const DATASETS: Record<string, Record<string, unknown>[]> = {
  users:    usersDataset,
  products: productsDataset,
  orders:   ordersDataset,
  workers:  workersDataset,
  cities:   citiesDataset,
};

export type SchemaKey = keyof typeof SCHEMAS;

export * from './users-schema';
export * from './products-schema';
export * from './orders-schema';
export * from './workers-schema';
export * from './cities-schema';
