/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const competitionReminder = pgTable("competition_reminder", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  reminderType: varchar("reminder_type", { length: 50 }).notNull(),
  reminderDate: date("reminder_date").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_competition_reminder_competition_id").on(table.competitionId),
  index("idx_competition_reminder_date").on(table.reminderDate),
  foreignKey({
    columns: [table.competitionId],
    foreignColumns: [competition.id],
    name: "competition_reminder_competition_id_fkey",
  }).onDelete("cascade"),
]);

export const competitionWork = pgTable("competition_work", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitionId: uuid("competition_id").notNull(),
  workName: varchar("work_name", { length: 200 }).notNull(),
  workDescription: text("work_description").notNull(),
  techStack: text("tech_stack").array().notNull().default([]),
  featureModules: jsonb("feature_modules").notNull().default('[]'),
  highlights: text("highlights").array().notNull().default([]),
  screenshots: text("screenshots").array().notNull().default([]),
  teamInfo: jsonb("team_info").notNull().default('[]'),
  innovationPoints: text("innovation_points").array().notNull().default([]),
  socialValue: text("social_value").notNull(),
  architectureDescription: text("architecture_description").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_competition_work_competition_id").on(table.competitionId),
  foreignKey({
    columns: [table.competitionId],
    foreignColumns: [competition.id],
    name: "competition_work_competition_id_fkey",
  }).onDelete("cascade"),
]);

export const competition = pgTable("competition", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  trackName: varchar("track_name", { length: 200 }).notNull(),
  officialUrl: text("official_url").notNull(),
  description: text("description").notNull(),
  trackIntroduction: text("track_introduction").notNull(),
  requirements: text("requirements").notNull(),
  awards: text("awards").notNull(),
  registrationStart: date("registration_start"),
  registrationEnd: date("registration_end"),
  submissionEnd: date("submission_end"),
  preliminaryDate: date("preliminary_date"),
  finalDate: date("final_date"),
  status: varchar("status", { length: 20 }).notNull().default('upcoming'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const personalizedRecommendation = pgTable("personalized_recommendation", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  recType: varchar("rec_type", { length: 30 }).notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  itemTitle: varchar("item_title", { length: 200 }),
  /**
   * @type { company?: string, city?: string, salary?: string, platform?: string, source?: string }
   */
  itemData: jsonb("item_data"),
  score: numeric("score").notNull().default('0'),
  reason: text("reason"),
  generatedAt: customTimestamptz("generated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE INDEX idx_pr_user_type ON personalized_recommendation USING btree (((user_id).user_id), rec_type),
  index("idx_pr_score").on(table.score),
]);

export const userBehaviorLog = pgTable("user_behavior_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(),
  targetType: varchar("target_type", { length: 30 }).notNull(),
  targetId: varchar("target_id", { length: 100 }),
  targetTitle: varchar("target_title", { length: 200 }),
  category: varchar("category", { length: 50 }),
  durationSeconds: integer("duration_seconds").default(0),
  /**
   * @type { source?: string, extra?: string }
   */
  metadata: jsonb("metadata"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  // Complex index: CREATE INDEX idx_ubl_user ON user_behavior_log USING btree (((user_id).user_id)),
  index("idx_ubl_action").on(table.actionType, table.targetType),
  index("idx_ubl_created").on(table.createdAt),
]);

export const jobPushRecord = pgTable("job_push_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  jobId: uuid("job_id").notNull(),
  jobTitle: varchar("job_title", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }),
  salary: varchar("salary", { length: 100 }),
  matchScore: numeric("match_score").notNull().default('0'),
  matchReasons: text("match_reasons").array().default([]),
  status: varchar("status", { length: 20 }).notNull().default('new'),
  isViewed: boolean("is_viewed").notNull().default(false),
  isApplied: boolean("is_applied").notNull().default(false),
  isIgnored: boolean("is_ignored").notNull().default(false),
  pushedAt: customTimestamptz("pushed_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  viewedAt: customTimestamptz("viewed_at", { precision: 3 }),
  appliedAt: customTimestamptz("applied_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_jpr_user ON job_push_record USING btree (((user_id).user_id)),
  index("idx_jpr_status").on(table.status),
  index("idx_jpr_score").on(table.matchScore),
]);

export const careerAssistantMessage = pgTable("career_assistant_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  content: text("content").notNull(),
  adviceType: varchar("advice_type", { length: 50 }),
  /**
   * @type { actionType?: string, relatedJobId?: string, relatedSkill?: string, priority?: string }
   */
  metadata: jsonb("metadata"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_cam_session").on(table.sessionId),
  index("idx_cam_created").on(table.createdAt),
  foreignKey({
    columns: [table.sessionId],
    foreignColumns: [careerAssistantSession.id],
    name: "career_assistant_message_session_id_fkey",
  }).onDelete("cascade"),
]);

export const careerAssistantSession = pgTable("career_assistant_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  sessionType: varchar("session_type", { length: 30 }).notNull().default('advice'),
  title: varchar("title", { length: 200 }),
  lastMessage: text("last_message"),
  lastAdviceType: varchar("last_advice_type", { length: 50 }),
  isRead: boolean("is_read").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_cas_user ON career_assistant_session USING btree (((user_id).user_id)),
]);

export const learningPlanItem = pgTable("learning_plan_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  planId: uuid("plan_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  skillId: uuid("skill_id"),
  taskType: varchar("task_type", { length: 30 }).notNull().default('learn'),
  plannedDate: date("planned_date").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  priority: integer("priority").notNull().default(2),
  orderIndex: integer("order_index").notNull().default(0),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  originalDate: date("original_date"),
  adjustmentReason: text("adjustment_reason"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_plan_item_plan").on(table.planId),
  index("idx_plan_item_date").on(table.plannedDate),
  foreignKey({
    columns: [table.planId],
    foreignColumns: [learningPlan.id],
    name: "learning_plan_item_plan_id_fkey",
  }).onDelete("cascade"),
]);

export const learningPlan = pgTable("learning_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: userProfile("user_id").notNull(),
  planName: varchar("plan_name", { length: 100 }).notNull(),
  targetSkill: varchar("target_skill", { length: 100 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  totalTasks: integer("total_tasks").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
  autoAdjust: boolean("auto_adjust").notNull().default(true),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_learning_plan_user ON learning_plan USING btree (((user_id).user_id)),
]);

export const skillGraphEdge = pgTable("skill_graph_edge", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromNodeId: uuid("from_node_id").notNull(),
  toNodeId: uuid("to_node_id").notNull(),
  relationType: varchar("relation_type", { length: 30 }).notNull().default('prerequisite'),
  weight: numeric("weight").notNull().default('1.0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  foreignKey({
    columns: [table.fromNodeId],
    foreignColumns: [skillGraphNode.id],
    name: "skill_graph_edge_from_node_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.toNodeId],
    foreignColumns: [skillGraphNode.id],
    name: "skill_graph_edge_to_node_id_fkey",
  }).onDelete("cascade"),
]);

export const skillGraphNode = pgTable("skill_graph_node", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  level: integer("level").notNull().default(1),
  xPos: numeric("x_pos"),
  yPos: numeric("y_pos"),
  relatedCourseIds: uuid("related_course_ids").array().default([]),
  relatedTaskIds: uuid("related_task_ids").array().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const salaryCalcRecord = pgTable("salary_calc_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: varchar("city", { length: 50 }).notNull(),
  grossSalary: numeric("gross_salary").notNull(),
  socialInsurance: numeric("social_insurance").notNull().default('0'),
  housingFund: numeric("housing_fund").notNull().default('0'),
  incomeTax: numeric("income_tax").notNull().default('0'),
  netSalary: numeric("net_salary").notNull().default('0'),
  socialBase: numeric("social_base"),
  fundBase: numeric("fund_base"),
  fundRatio: numeric("fund_ratio"),
  yearEndBonus: numeric("year_end_bonus"),
  annualNetIncome: numeric("annual_net_income"),
  /**
   * @type { pension: number; medical: number; unemployment: number; injury: number; maternity: number; specialDeduction: number; taxBracket: string }
   */
  details: jsonb("details").notNull().default('{}'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const note = pgTable("note", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull().default('general'),
  tags: text("tags").array().notNull().default([]),
  isPinned: boolean("is_pinned").notNull().default(false),
  wordCount: integer("word_count").notNull().default(0),
  relatedSkill: varchar("related_skill", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const calendarEvent = pgTable("calendar_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventType: varchar("event_type", { length: 30 }).notNull().default('general'),
  eventDate: date("event_date").notNull(),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  location: varchar("location", { length: 200 }),
  relatedTaskId: uuid("related_task_id"),
  relatedCompany: varchar("related_company", { length: 100 }),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'),
  isAllDay: boolean("is_all_day").notNull().default(false),
  reminderMinutesBefore: integer("reminder_minutes_before"),
  isReminderSent: boolean("is_reminder_sent").notNull().default(false),
  color: varchar("color", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const jobCompetition = pgTable("job_competition", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobTitle: varchar("job_title", { length: 100 }).notNull(),
  jobType: varchar("job_type", { length: 50 }),
  city: varchar("city", { length: 50 }),
  totalApplicants: integer("total_applicants").notNull().default(0),
  totalPositions: integer("total_positions").notNull().default(0),
  acceptanceRate: numeric("acceptance_rate").notNull().default('0'),
  hotLevel: varchar("hot_level", { length: 20 }).notNull().default('medium'),
  hotScore: integer("hot_score").notNull().default(50),
  avgSalary: numeric("avg_salary"),
  trendDirection: varchar("trend_direction", { length: 20 }).default('stable'),
  trendPercentage: numeric("trend_percentage").default('0'),
  requiredSkills: text("required_skills").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const cityCostOfLiving = pgTable("city_cost_of_living", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: varchar("city", { length: 50 }).notNull(),
  avgRent: numeric("avg_rent").notNull().default('0'),
  avgFood: numeric("avg_food").notNull().default('0'),
  avgTransport: numeric("avg_transport").notNull().default('0'),
  avgUtilities: numeric("avg_utilities").notNull().default('0'),
  avgEntertainment: numeric("avg_entertainment").notNull().default('0'),
  avgTotal: numeric("avg_total").notNull().default('0'),
  costIndex: numeric("cost_index").notNull().default('100.00'),
  avgSalary: numeric("avg_salary").notNull().default('0'),
  disposableIncome: numeric("disposable_income").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const growthReport = pgTable("growth_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportType: varchar("report_type", { length: 20 }).notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  /**
   * @type { name: string; level: number }[]
   */
  skillsGained: jsonb("skills_gained").notNull().default('[]'),
  /**
   * @type { name: string; before: number; after: number }[]
   */
  skillsImproved: jsonb("skills_improved").notNull().default('[]'),
  taskCompletionRate: numeric("task_completion_rate").notNull().default('0'),
  checkinDays: integer("checkin_days").notNull().default(0),
  totalStudyMinutes: integer("total_study_minutes").notNull().default(0),
  applicationCount: integer("application_count").notNull().default(0),
  interviewCount: integer("interview_count").notNull().default(0),
  offerCount: integer("offer_count").notNull().default(0),
  summary: text("summary"),
  highlights: text("highlights"),
  improvements: text("improvements"),
  nextGoals: text("next_goals"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const wrongQuestion = pgTable("wrong_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: varchar("source_type", { length: 30 }).notNull(),
  sourceId: varchar("source_id", { length: 100 }).notNull(),
  questionTitle: text("question_title").notNull(),
  questionContent: text("question_content"),
  userAnswer: text("user_answer"),
  correctAnswer: text("correct_answer"),
  analysis: text("analysis"),
  wrongCount: integer("wrong_count").notNull().default(1),
  isMastered: boolean("is_mastered").notNull().default(false),
  category: varchar("category", { length: 50 }),
  tags: text("tags").array().notNull().default([]),
  lastWrongAt: customTimestamptz("last_wrong_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const courseRecommendation = pgTable("course_recommendation", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  platformUrl: text("platform_url"),
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default('beginner'),
  estimatedHours: numeric("estimated_hours"),
  priority: integer("priority").notNull().default(5),
  description: text("description"),
  coverUrl: text("cover_url"),
  rating: numeric("rating"),
  studentCount: integer("student_count"),
  instructor: varchar("instructor", { length: 100 }),
  isFree: boolean("is_free").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const companyReview = pgTable("company_review", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 200 }).notNull(),
  companyId: varchar("company_id", { length: 100 }),
  overallRating: numeric("overall_rating").notNull().default('3.0'),
  workLifeBalanceRating: numeric("work_life_balance_rating"),
  salaryRating: numeric("salary_rating"),
  growthRating: numeric("growth_rating"),
  cultureRating: numeric("culture_rating"),
  overtimeLevel: varchar("overtime_level", { length: 20 }),
  realSalary: text("real_salary"),
  interviewExperience: text("interview_experience"),
  pros: text("pros"),
  cons: text("cons"),
  jobTitle: varchar("job_title", { length: 100 }),
  employmentStatus: varchar("employment_status", { length: 30 }),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  helpfulCount: integer("helpful_count").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const writtenExamRecord = pgTable("written_exam_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  category: varchar("category", { length: 30 }).notNull(),
  totalScore: integer("total_score").notNull().default(100),
  userScore: integer("user_score").notNull().default(0),
  correctCount: integer("correct_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  /**
   * @type { questionId: string; userAnswer: string; isCorrect: boolean }[]
   */
  answers: jsonb("answers").notNull().default('[]'),
  status: varchar("status", { length: 20 }).notNull().default('finished'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const writtenExamQuestion = pgTable("written_exam_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 30 }).notNull().default('aptitude'),
  subCategory: varchar("sub_category", { length: 50 }),
  questionType: varchar("question_type", { length: 20 }).notNull().default('single_choice'),
  title: text("title").notNull(),
  /**
   * @type { label: string; value: string }[]
   */
  options: jsonb("options").notNull().default('[]'),
  correctAnswer: text("correct_answer").notNull(),
  analysis: text("analysis"),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default('medium'),
  score: integer("score").notNull().default(10),
  timeLimitSeconds: integer("time_limit_seconds"),
  tags: text("tags").array().notNull().default([]),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const mockInterviewMessage = pgTable("mock_interview_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  questionIndex: integer("question_index").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.sessionId],
    foreignColumns: [mockInterviewSession.id],
    name: "mock_interview_message_session_id_fkey",
  }).onDelete("cascade"),
]);

export const mockInterviewSession = pgTable("mock_interview_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: varchar("job_type", { length: 50 }).notNull().default('data_engineer'),
  interviewType: varchar("interview_type", { length: 20 }).notNull().default('technical'),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default('medium'),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  score: integer("score"),
  feedback: text("feedback"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  suggestions: text("suggestions"),
  totalQuestions: integer("total_questions").notNull().default(5),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  startedAt: customTimestamptz("started_at", { precision: 3 }),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const milestoneReminder = pgTable("milestone_reminder", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull(),
  remindDaysBefore: integer("remind_days_before").notNull().default(1),
  isEnabled: boolean("is_enabled").notNull().default(true),
  lastRemindedAt: customTimestamptz("last_reminded_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_milestone_reminder_milestone").on(table.milestoneId),
  index("idx_milestone_reminder_enabled").on(table.isEnabled),
  foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [taskMilestone.id],
    name: "milestone_reminder_milestone_id_fkey",
  }).onDelete("cascade"),
]);

export const salaryPredictionLog = pgTable("salary_prediction_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: varchar("city", { length: 100 }).notNull(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  skills: text("skills").array().notNull().default([]),
  experienceYears: numeric("experience_years").notNull().default('0'),
  predictedMin: integer("predicted_min").notNull().default(0),
  predictedMax: integer("predicted_max").notNull().default(0),
  predictedAvg: integer("predicted_avg").notNull().default(0),
  confidence: numeric("confidence").notNull().default('0'),
  /**
   * @type { topPositive: string[]; topNegative: string[] }
   */
  factors: jsonb("factors").notNull().default('{}'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_salary_prediction_user ON salary_prediction_log USING btree (((_created_by).user_id)),
]);

export const industryTrend = pgTable("industry_trend", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  avgSalary: numeric("avg_salary").notNull().default('0'),
  demandCount: integer("demand_count").notNull().default(0),
  topSkills: text("top_skills").array().notNull().default([]),
  trendDirection: varchar("trend_direction", { length: 20 }).notNull().default('stable'),
  trendPercentage: numeric("trend_percentage").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_industry_trend_job").on(table.jobType),
  index("idx_industry_trend_city").on(table.city),
  index("idx_industry_trend_period").on(table.period),
]);

export const aiChatMessage = pgTable("ai_chat_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_ai_chat_message_session").on(table.sessionId),
  index("idx_ai_chat_message_sort").on(table.sessionId, table.sortOrder),
  foreignKey({
    columns: [table.sessionId],
    foreignColumns: [aiChatSession.id],
    name: "ai_chat_message_session_id_fkey",
  }).onDelete("cascade"),
]);

export const aiChatSession = pgTable("ai_chat_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull().default('新对话'),
  contextType: varchar("context_type", { length: 50 }).notNull().default('general'),
  /**
   * @type { targetJob?: string; skillName?: string }
   */
  contextData: jsonb("context_data").notNull().default('{}'),
  lastMessageAt: customTimestamptz("last_message_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE INDEX idx_ai_chat_session_user ON ai_chat_session USING btree (((_created_by).user_id)),
  index("idx_ai_chat_session_context").on(table.contextType),
]);

export const studyCheckin = pgTable("study_checkin", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkinDate: date("checkin_date").notNull().default('CURRENT_DATE'),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  content: text("content").notNull(),
  relatedSkills: text("related_skills").array().notNull().default([]),
  mood: varchar("mood", { length: 20 }).notNull().default('good'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  // Complex index: CREATE UNIQUE INDEX idx_study_checkin_user_date ON study_checkin USING btree (((_created_by).user_id), checkin_date),
]);

export const interviewRecord = pgTable("interview_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionId: uuid("question_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('unattempted'),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isWrong: boolean("is_wrong").notNull().default(false),
  userAnswer: text("user_answer").notNull(),
  note: text("note").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastAttemptAt: customTimestamptz("last_attempt_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.questionId],
    foreignColumns: [interviewQuestion.id],
    name: "interview_record_question_id_fkey",
  }).onDelete("cascade"),
]);

export const interviewQuestion = pgTable("interview_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 50 }).notNull().default('technical'),
  jobType: varchar("job_type", { length: 50 }).notNull().default('data_engineer'),
  difficulty: varchar("difficulty", { length: 20 }).notNull().default('medium'),
  tags: text("tags").array().notNull().default([]),
  source: varchar("source", { length: 100 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_interview_question_category").on(table.category),
  index("idx_interview_question_job_type").on(table.jobType),
  index("idx_interview_question_difficulty").on(table.difficulty),
]);

export const userResume = pgTable("user_resume", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id"),
  title: varchar("title", { length: 200 }).notNull(),
  /**
   * @type { name: string; phone: string; email: string; city: string; jobIntention: string; avatarUrl: string }
   */
  personalInfo: jsonb("personal_info").notNull().default('{}'),
  /**
   * @type { school: string; major: string; degree: string; startDate: string; endDate: string; description: string }[]
   */
  education: jsonb("education").notNull().default('[]'),
  /**
   * @type { company: string; position: string; startDate: string; endDate: string; description: string }[]
   */
  experience: jsonb("experience").notNull().default('[]'),
  /**
   * @type { name: string; role: string; startDate: string; endDate: string; description: string; techStack: string[] }[]
   */
  projects: jsonb("projects").notNull().default('[]'),
  /**
   * @type { name: string; level: string }[]
   */
  skills: jsonb("skills").notNull().default('[]'),
  /**
   * @type { name: string; issuer: string; date: string }[]
   */
  certificates: jsonb("certificates").notNull().default('[]'),
  selfEvaluation: text("self_evaluation").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [resumeTemplate.id],
    name: "user_resume_template_id_fkey",
  }).onDelete("set null"),
]);

export const resumeTemplate = pgTable("resume_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  templateKey: varchar("template_key", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  previewUrl: varchar("preview_url", { length: 500 }).notNull(),
  styleCategory: varchar("style_category", { length: 50 }).notNull().default('classic'),
  isActive: boolean("is_active").notNull().default(true),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("resume_template_template_key_key").on(table.templateKey),
]);

export const careerStage = pgTable("career_stage", {
  id: uuid("id").primaryKey().defaultRandom(),
  pathId: uuid("path_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  durationWeeks: integer("duration_weeks").notNull().default(4),
  requiredSkills: text("required_skills").array().notNull().default([]),
  tasks: text("tasks").array().notNull().default([]),
  resources: text("resources").array().notNull().default([]),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_career_stage_path").on(table.pathId),
  index("idx_career_stage_sort").on(table.pathId, table.sortOrder),
  foreignKey({
    columns: [table.pathId],
    foreignColumns: [careerPath.id],
    name: "career_stage_path_id_fkey",
  }).onDelete("cascade"),
]);

export const careerPath = pgTable("career_path", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  targetJob: varchar("target_job", { length: 200 }).notNull(),
  description: text("description").notNull(),
  durationMonths: integer("duration_months").notNull().default(3),
  status: varchar("status", { length: 20 }).notNull().default('planning'),
  currentStage: integer("current_stage").notNull().default(0),
  totalStages: integer("total_stages").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_career_path_status").on(table.status),
]);

export const taskSubTaskSkill = pgTable("task_sub_task_skill", {
  id: uuid("id").primaryKey().defaultRandom(),
  subTaskId: uuid("sub_task_id").notNull(),
  skillId: uuid("skill_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("task_sub_task_skill_sub_task_id_skill_id_key").on(table.subTaskId, table.skillId),
  foreignKey({
    columns: [table.subTaskId],
    foreignColumns: [taskSubTask.id],
    name: "task_sub_task_skill_sub_task_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.skillId],
    foreignColumns: [skill.id],
    name: "task_sub_task_skill_skill_id_fkey",
  }).onDelete("cascade"),
]);

export const taskMilestoneSkill = pgTable("task_milestone_skill", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull(),
  skillId: uuid("skill_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("task_milestone_skill_milestone_id_skill_id_key").on(table.milestoneId, table.skillId),
  foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [taskMilestone.id],
    name: "task_milestone_skill_milestone_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.skillId],
    foreignColumns: [skill.id],
    name: "task_milestone_skill_skill_id_fkey",
  }).onDelete("cascade"),
]);

export const taskGroupSkill = pgTable("task_group_skill", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull(),
  skillId: uuid("skill_id").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("task_group_skill_group_id_skill_id_key").on(table.groupId, table.skillId),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [taskGroup.id],
    name: "task_group_skill_group_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.skillId],
    foreignColumns: [skill.id],
    name: "task_group_skill_skill_id_fkey",
  }).onDelete("cascade"),
]);

export const taskSubTask = pgTable("task_sub_task", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull(),
  groupId: uuid("group_id").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: customTimestamptz("completed_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_task_sub_task_milestone").on(table.milestoneId),
  index("idx_task_sub_task_group").on(table.groupId),
  index("idx_task_sub_task_sort").on(table.milestoneId, table.sortOrder),
  foreignKey({
    columns: [table.milestoneId],
    foreignColumns: [taskMilestone.id],
    name: "task_sub_task_milestone_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [taskGroup.id],
    name: "task_sub_task_group_id_fkey",
  }).onDelete("cascade"),
]);

export const taskMilestone = pgTable("task_milestone", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  totalSubTasks: integer("total_sub_tasks").notNull().default(0),
  completedSubTasks: integer("completed_sub_tasks").notNull().default(0),
  progress: numeric("progress").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_task_milestone_group").on(table.groupId),
  index("idx_task_milestone_sort").on(table.groupId, table.sortOrder),
  foreignKey({
    columns: [table.groupId],
    foreignColumns: [taskGroup.id],
    name: "task_milestone_group_id_fkey",
  }).onDelete("cascade"),
]);

export const taskGroup = pgTable("task_group", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  relatedSkills: text("related_skills").array().notNull().default([]),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'),
  status: varchar("status", { length: 20 }).notNull().default('in_progress'),
  dueDate: date("due_date"),
  totalMilestones: integer("total_milestones").notNull().default(0),
  totalSubTasks: integer("total_sub_tasks").notNull().default(0),
  completedSubTasks: integer("completed_sub_tasks").notNull().default(0),
  progress: numeric("progress").notNull().default('0'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_task_group_status").on(table.status),
]);

export const newsFetchLog = pgTable("news_fetch_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: varchar("source", { length: 100 }).notNull(),
  fetchedAt: customTimestamptz("fetched_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  newCount: integer("new_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default('success'),
  errorMsg: text("error_msg"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_news_fetch_log_time").on(table.fetchedAt),
]);

export const newsReadStatus = pgTable("news_read_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  articleId: uuid("article_id").notNull(),
  readAt: customTimestamptz("read_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("idx_news_read_user_article").on(table.userId, table.articleId),
  foreignKey({
    columns: [table.articleId],
    foreignColumns: [newsArticle.id],
    name: "news_read_status_article_id_fkey",
  }).onDelete("cascade"),
]);

export const newsArticle = pgTable("news_article", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  sourceUrl: varchar("source_url", { length: 1000 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull().default('general'),
  tags: text("tags").array().notNull().default([]),
  isImportant: boolean("is_important").notNull().default(false),
  importanceScore: integer("importance_score").notNull().default(0),
  importantCategory: varchar("important_category", { length: 50 }),
  publishDate: customTimestamptz("publish_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_news_article_source").on(table.source),
  index("idx_news_article_category").on(table.category),
  index("idx_news_article_publish_date").on(table.publishDate),
  index("idx_news_article_is_important").on(table.isImportant),
  index("idx_news_article_important_category").on(table.importantCategory),
  uniqueIndex("idx_news_article_source_url").on(table.sourceUrl),
]);

export const learningResource = pgTable("learning_resource", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 300 }).notNull(),
  platform: varchar("platform", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default('python'),
  isFree: boolean("is_free").notNull().default(true),
  relatedSkill: varchar("related_skill", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  description: text("description").notNull(),
  duration: varchar("duration", { length: 50 }).notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const job = pgTable("job", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  company: varchar("company", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  salary: varchar("salary", { length: 100 }).notNull(),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  requirements: text("requirements").notNull(),
  description: text("description").notNull(),
  requiredSkills: text("required_skills").array().notNull().default([]),
  jobType: varchar("job_type", { length: 50 }).notNull().default('full_time'),
  source: varchar("source", { length: 100 }).notNull(),
  applyUrl: varchar("apply_url", { length: 500 }).notNull(),
  publishDate: customTimestamptz("publish_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_job_city").on(table.city),
  index("idx_job_job_type").on(table.jobType),
]);

export const news = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 300 }).notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default('industry'),
  tags: text("tags").array().notNull().default([]),
  publishDate: customTimestamptz("publish_date", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_news_category").on(table.category),
  index("idx_news_publish_date").on(table.publishDate),
]);

export const application = pgTable("application", {
  id: uuid("id").primaryKey().defaultRandom(),
  company: varchar("company", { length: 200 }).notNull(),
  position: varchar("position", { length: 200 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  salary: varchar("salary", { length: 100 }).notNull(),
  applicationDate: date("application_date").notNull().default('CURRENT_DATE'),
  status: varchar("status", { length: 30 }).notNull().default('submitted'),
  applicationType: varchar("application_type", { length: 20 }).notNull().default('campus'),
  source: varchar("source", { length: 200 }).notNull(),
  notes: text("notes").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const task = pgTable("task", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  relatedSkills: text("related_skills").array().notNull().default([]),
  estimatedTime: integer("estimated_time").notNull().default(0),
  priority: varchar("priority", { length: 20 }).notNull().default('medium'),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  taskType: varchar("task_type", { length: 20 }).notNull().default('learning'),
  dueDate: date("due_date"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const skillAssessmentHistory = pgTable("skill_assessment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id").notNull(),
  masteryLevel: integer("mastery_level").notNull().default(0),
  assessmentDate: date("assessment_date").notNull().default('CURRENT_DATE'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  foreignKey({
    columns: [table.skillId],
    foreignColumns: [skill.id],
    name: "skill_assessment_history_skill_id_fkey",
  }).onDelete("cascade"),
]);

export const skill = pgTable("skill", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull().default('programming_language'),
  description: text("description").notNull(),
  masteryLevel: integer("mastery_level").notNull().default(0),
  /**
   * @type { name: string; mastered: boolean }[]
   */
  knowledgePoints: jsonb("knowledge_points").notNull().default('[]'),
  selfRating: integer("self_rating").notNull().default(0),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  school: varchar("school", { length: 200 }).notNull(),
  department: varchar("department", { length: 200 }).notNull(),
  major: varchar("major", { length: 200 }).notNull(),
  grade: varchar("grade", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  jobIntention: varchar("job_intention", { length: 200 }).notNull(),
  contact: varchar("contact", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  bio: text("bio").notNull(),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("profile_user_id_key").on(table.userId),
]);

// table aliases
export const aiChatMessageTable = aiChatMessage;
export const aiChatSessionTable = aiChatSession;
export const applicationTable = application;
export const calendarEventTable = calendarEvent;
export const careerAssistantMessageTable = careerAssistantMessage;
export const careerAssistantSessionTable = careerAssistantSession;
export const careerPathTable = careerPath;
export const careerStageTable = careerStage;
export const cityCostOfLivingTable = cityCostOfLiving;
export const companyReviewTable = companyReview;
export const competitionTable = competition;
export const competitionReminderTable = competitionReminder;
export const competitionWorkTable = competitionWork;
export const courseRecommendationTable = courseRecommendation;
export const growthReportTable = growthReport;
export const industryTrendTable = industryTrend;
export const interviewQuestionTable = interviewQuestion;
export const interviewRecordTable = interviewRecord;
export const jobTable = job;
export const jobCompetitionTable = jobCompetition;
export const jobPushRecordTable = jobPushRecord;
export const learningPlanTable = learningPlan;
export const learningPlanItemTable = learningPlanItem;
export const learningResourceTable = learningResource;
export const milestoneReminderTable = milestoneReminder;
export const mockInterviewMessageTable = mockInterviewMessage;
export const mockInterviewSessionTable = mockInterviewSession;
export const newsTable = news;
export const newsArticleTable = newsArticle;
export const newsFetchLogTable = newsFetchLog;
export const newsReadStatusTable = newsReadStatus;
export const noteTable = note;
export const personalizedRecommendationTable = personalizedRecommendation;
export const profileTable = profile;
export const resumeTemplateTable = resumeTemplate;
export const salaryCalcRecordTable = salaryCalcRecord;
export const salaryPredictionLogTable = salaryPredictionLog;
export const skillTable = skill;
export const skillAssessmentHistoryTable = skillAssessmentHistory;
export const skillGraphEdgeTable = skillGraphEdge;
export const skillGraphNodeTable = skillGraphNode;
export const studyCheckinTable = studyCheckin;
export const taskTable = task;
export const taskGroupTable = taskGroup;
export const taskGroupSkillTable = taskGroupSkill;
export const taskMilestoneTable = taskMilestone;
export const taskMilestoneSkillTable = taskMilestoneSkill;
export const taskSubTaskTable = taskSubTask;
export const taskSubTaskSkillTable = taskSubTaskSkill;
export const userBehaviorLogTable = userBehaviorLog;
export const userResumeTable = userResume;
export const writtenExamQuestionTable = writtenExamQuestion;
export const writtenExamRecordTable = writtenExamRecord;
export const wrongQuestionTable = wrongQuestion;
