/**
 * Схема бази даних (Drizzle ORM + PostgreSQL).
 *
 * Аналогія: база — це шафа, а кожна таблиця — окрема папка з однаковими бланками.
 * Тут ми описуємо, які "бланки" (колонки) є в кожній папці.
 * Після змін у цьому файлі запусти `npm run db:push`, щоб оновити саму базу.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- Перелічення (enum) — фіксований набір значень ----------
export const roleEnum = pgEnum("role", ["parent", "student", "teacher", "admin"]);
export const planEnum = pgEnum("plan", ["basic", "standard", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending", // створена, чекаємо оплату
  "active", // оплачено, доступ відкрито
  "past_due", // списання не пройшло, діє пільговий період
  "canceled", // скасована (доступ до кінця оплаченого місяця)
]);
export const courseStatusEnum = pgEnum("course_status", ["published", "soon"]);
export const homeworkStatusEnum = pgEnum("homework_status", ["pending", "submitted", "reviewed"]);
export const consentTypeEnum = pgEnum("consent_type", [
  "age_confirm", // "мені є 18, я батько/мати/опікун"
  "child_data", // згода на обробку даних дитини
  "offer", // прийняття публічної оферти
  "immediate_access", // згода на негайний доступ до цифрового контенту
]);

// ---------- Користувачі ----------
// Батьки входять за email, діти — за логіном, який створюють батьки.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    role: roleEnum("role").notNull(),
    login: text("login").notNull(), // email для батьків, логін для дитини
    email: text("email"), // лише для батьків/викладачів
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(), // для дитини — ім'я або нікнейм
    birthYear: integer("birth_year"), // лише для дитини
    parentId: uuid("parent_id"), // для дитини — хто її батьки
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_login_idx").on(t.login), index("users_parent_idx").on(t.parentId)],
);

// ---------- Курси та уроки ----------
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(), // start | web | design | code | mobile | games
  ageFrom: integer("age_from").notNull(),
  ageTo: integer("age_to").notNull(),
  description: text("description").notNull(),
  status: courseStatusEnum("status").notNull().default("soon"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    order: integer("order").notNull(), // 1, 2, 3... — порядок проходження
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(), // простий Markdown
    videoUrl: text("video_url"),
    xp: integer("xp").notNull().default(100),
    homeworkPrompt: text("homework_prompt"), // якщо є — після уроку буде домашка
  },
  (t) => [uniqueIndex("lessons_course_order_idx").on(t.courseId, t.order)],
);

// ---------- Прогрес і домашки ----------
export const lessonProgress = pgTable(
  "lesson_progress",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.lessonId] })],
);

export const homework = pgTable(
  "homework",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: homeworkStatusEnum("status").notNull().default("pending"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    answer: text("answer"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    needsTeacher: boolean("needs_teacher").notNull().default(false), // тариф Преміум
    score: integer("score"),
    teacherComment: text("teacher_comment"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("homework_student_lesson_idx").on(t.studentId, t.lessonId)],
);

// ---------- Підписки та платежі ----------
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").references(() => users.id, { onDelete: "set null" }),
    plan: planEnum("plan").notNull(),
    courseId: uuid("course_id").references(() => courses.id), // для Простого і Середнього
    status: subscriptionStatusEnum("status").notNull().default("pending"),
    orderReference: text("order_reference").notNull().unique(),
    amount: integer("amount").notNull(), // грн за місяць
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    recToken: text("rec_token"),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    remindedForPeriodEnd: timestamp("reminded_for_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_student_idx").on(t.studentId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    orderReference: text("order_reference").notNull(),
    amount: text("amount").notNull(),
    currency: text("currency").notNull(),
    transactionStatus: text("transaction_status").notNull(),
    // унікальний ключ події від WayForPay — щоб повторний callback не записався двічі
    eventKey: text("event_key").notNull().unique(),
    raw: jsonb("raw").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_subscription_idx").on(t.subscriptionId)],
);

// ---------- Юридичні згоди (доказ у разі спору) ----------
export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: consentTypeEnum("type").notNull(),
    documentVersion: text("document_version").notNull(),
    subjectId: uuid("subject_id"), // напр. дитина або підписка, до якої стосується згода
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("consents_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Homework = typeof homework.$inferSelect;
