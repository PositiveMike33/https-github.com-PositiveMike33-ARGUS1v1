import { integer, pgTable, serial, text, timestamp, doublePrecision, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'decisions' table with a foreign key to 'users'
export const decisions = pgTable('decisions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  feedId: text('feed_id').notNull(),
  feedTitle: text('feed_title').notNull(),
  feedType: text('feed_type').notNull(),
  timestamp: text('timestamp').notNull(),
  entropyScore: doublePrecision('entropy_score').notNull(),
  finalDecision: text('final_decision').notNull(),
  cached: boolean('cached').notNull(),
  durationMs: integer('duration_ms').notNull(),
  branches: jsonb('branches').notNull(), // Stores the branches array as JSONB
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'telemetry_logs' table with a foreign key to 'users'
export const telemetryLogs = pgTable('telemetry_logs', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  endpoint: text('endpoint').notNull(),
  status: integer('status').notNull(),
  responseSize: text('response_size').notNull(),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'keep_notes' table with a foreign key to 'users'
export const keepNotes = pgTable('keep_notes', {
  id: text('id').primaryKey(), // unique uuid or Google Keep ID
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  isSynced: boolean('is_synced').default(false).notNull(), // true if successfully pushed to Google Keep API
  googleKeepId: text('google_keep_id'), // ID from Google Keep API if synced
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  decisions: many(decisions),
  telemetryLogs: many(telemetryLogs),
  keepNotes: many(keepNotes),
}));

export const decisionsRelations = relations(decisions, ({ one }) => ({
  user: one(users, {
    fields: [decisions.userId],
    references: [users.id],
  }),
}));

export const telemetryLogsRelations = relations(telemetryLogs, ({ one }) => ({
  user: one(users, {
    fields: [telemetryLogs.userId],
    references: [users.id],
  }),
}));

export const keepNotesRelations = relations(keepNotes, ({ one }) => ({
  user: one(users, {
    fields: [keepNotes.userId],
    references: [users.id],
  }),
}));
