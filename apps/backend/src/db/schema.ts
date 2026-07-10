import { relations, sql } from 'drizzle-orm';
import {
  check,
  customType,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: string) {
    return JSON.parse(value) as number[];
  },
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  timezone: text('timezone').notNull().default('UTC'),
  checkinTime: time('checkin_time').notNull().default('08:00'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ventures = pgTable(
  'ventures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    priorityWeight: numeric('priority_weight', { precision: 3, scale: 2 })
      .notNull()
      .default('1.0'),
    status: text('status').notNull().default('active'),
    maxDaysWithoutAttention: integer('max_days_without_attention').notNull().default(3),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ventures_user').on(table.userId).where(sql`status = 'active'`),
    check('ventures_status_check', sql`${table.status} in ('active','paused','archived')`),
  ],
);

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ventureId: uuid('venture_id')
      .notNull()
      .references(() => ventures.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    deadline: date('deadline'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_goals_venture').on(table.ventureId),
    check('goals_status_check', sql`${table.status} in ('active','done','abandoned')`),
  ],
);

export const ventureContextChunks = pgTable(
  'venture_context_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ventureId: uuid('venture_id')
      .notNull()
      .references(() => ventures.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    sourceId: uuid('source_id'),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_context_venture').on(table.ventureId),
    check(
      'venture_context_chunks_source_type_check',
      sql`${table.sourceType} in ('goal','note','checkin_summary','manual_input')`,
    ),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ventureId: uuid('venture_id')
      .notNull()
      .references(() => ventures.id, { onDelete: 'cascade' }),
    goalId: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    parentTaskId: uuid('parent_task_id'),
    title: text('title').notNull(),
    description: text('description'),
    level: text('level').notNull(),
    estimatedMinutes: integer('estimated_minutes'),
    status: text('status').notNull().default('backlog'),
    generatedBy: text('generated_by').notNull().default('ai'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tasks_venture').on(table.ventureId),
    index('idx_tasks_parent').on(table.parentTaskId),
    index('idx_tasks_status').on(table.status),
    check('tasks_level_check', sql`${table.level} in ('project','epic','task','micro_task')`),
    check(
      'tasks_status_check',
      sql`${table.status} in ('backlog','proposed','scheduled','done','skipped','rescheduled')`,
    ),
    check('tasks_generated_by_check', sql`${table.generatedBy} in ('ai','user')`),
  ],
);

export const dailyPlans = pgTable(
  'daily_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planDate: date('plan_date').notNull(),
    status: text('status').notNull().default('proposed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('daily_plans_user_id_plan_date_unique').on(table.userId, table.planDate),
    check('daily_plans_status_check', sql`${table.status} in ('proposed','confirmed','completed')`),
  ],
);

export const dailyPlanTasks = pgTable(
  'daily_plan_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dailyPlanId: uuid('daily_plan_id')
      .notNull()
      .references(() => dailyPlans.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    slot: smallint('slot').notNull(),
    rationale: text('rationale'),
    calendarEventId: text('calendar_event_id'),
    outcome: text('outcome'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_dpt_plan').on(table.dailyPlanId),
    uniqueIndex('daily_plan_tasks_daily_plan_id_slot_unique').on(table.dailyPlanId, table.slot),
    check('daily_plan_tasks_slot_check', sql`${table.slot} in (1,2,3)`),
    check('daily_plan_tasks_outcome_check', sql`${table.outcome} in ('done','not_done','partial')`),
  ],
);

export const checkins = pgTable(
  'checkins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dailyPlanId: uuid('daily_plan_id').references(() => dailyPlans.id, { onDelete: 'set null' }),
    type: text('type').notNull(),
    status: text('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    check('checkins_type_check', sql`${table.type} in ('morning','evening')`),
    check('checkins_status_check', sql`${table.status} in ('in_progress','completed','abandoned')`),
  ],
);

export const checkinMessages = pgTable(
  'checkin_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    checkinId: uuid('checkin_id')
      .notNull()
      .references(() => checkins.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_checkin_messages_checkin').on(table.checkinId),
    check('checkin_messages_role_check', sql`${table.role} in ('user','assistant')`),
  ],
);

export const ventureAttentionLog = pgTable(
  'venture_attention_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ventureId: uuid('venture_id')
      .notNull()
      .references(() => ventures.id, { onDelete: 'cascade' }),
    dailyPlanId: uuid('daily_plan_id')
      .notNull()
      .references(() => dailyPlans.id, { onDelete: 'cascade' }),
    attendedAt: date('attended_at').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_attention_venture_date').on(table.ventureId, table.attendedAt)],
);

export const calendarConnections = pgTable(
  'calendar_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    externalCalendarId: text('external_calendar_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('calendar_connections_provider_check', sql`${table.provider} in ('google','apple')`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  ventures: many(ventures),
}));

export const venturesRelations = relations(ventures, ({ one, many }) => ({
  user: one(users, {
    fields: [ventures.userId],
    references: [users.id],
  }),
  goals: many(goals),
}));

export const schema = {
  users,
  ventures,
  goals,
  ventureContextChunks,
  tasks,
  dailyPlans,
  dailyPlanTasks,
  checkins,
  checkinMessages,
  ventureAttentionLog,
  calendarConnections,
  usersRelations,
  venturesRelations,
};

export type DbUser = typeof users.$inferSelect;
export type DbVenture = typeof ventures.$inferSelect;
