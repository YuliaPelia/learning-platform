-- CreateEnum
CREATE TYPE "PlannerSource" AS ENUM ('student', 'ai');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'normal', 'high');

-- CreateEnum
CREATE TYPE "SlotKind" AS ENUM ('lesson', 'homework', 'practice', 'rest', 'other');

-- CreateTable
CREATE TABLE "study_tasks" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "due_date" DATE,
    "priority" "TaskPriority" NOT NULL DEFAULT 'normal',
    "est_minutes" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "done_at" TIMESTAMP(3),
    "source" "PlannerSource" NOT NULL DEFAULT 'student',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_slots" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "SlotKind" NOT NULL DEFAULT 'other',
    "source" "PlannerSource" NOT NULL DEFAULT 'student',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_profiles" (
    "student_id" UUID NOT NULL,
    "minutes_per_day" INTEGER NOT NULL DEFAULT 45,
    "study_days" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4]::INTEGER[],
    "busy_note" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL DEFAULT '',
    "ai_day" TEXT,
    "ai_count" INTEGER NOT NULL DEFAULT 0,
    "ai_tip" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_profiles_pkey" PRIMARY KEY ("student_id")
);

-- CreateIndex
CREATE INDEX "study_tasks_student_id_done_idx" ON "study_tasks"("student_id", "done");

-- CreateIndex
CREATE INDEX "schedule_slots_student_id_weekday_idx" ON "schedule_slots"("student_id", "weekday");

-- AddForeignKey
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_slots" ADD CONSTRAINT "schedule_slots_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_profiles" ADD CONSTRAINT "study_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

