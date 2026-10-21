import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const kitchenSettings = sqliteTable('kitchen_settings', {
  ownerId: text('owner_id').primaryKey(),
  inputJson: text('input_json').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const meals = sqliteTable('meals', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  recipeId: text('recipe_id').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  inputJson: text('input_json').notNull(),
  status: text('status', { enum: ['planned', 'cooking', 'completed'] }).notNull().default('planned'),
  stepIndex: integer('step_index').notNull().default(0),
  feedback: text('feedback', { enum: ['liked', 'too-hard', 'skip'] }),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
}, (table) => [index('meals_owner_created_idx').on(table.ownerId, table.createdAt)]);

export const shoppingItems = sqliteTable('shopping_items', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  unit: text('unit').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, (table) => [uniqueIndex('shopping_owner_name_unit_idx').on(table.ownerId, table.name, table.unit)]);

export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey(),
  count: integer('count').notNull(),
  resetAt: integer('reset_at').notNull(),
});
