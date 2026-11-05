-- Кабінет без AI: прибираємо службові поля AI-помічника (таблиці щойно створені й порожні)
ALTER TABLE "study_tasks" DROP COLUMN "source";
ALTER TABLE "schedule_slots" DROP COLUMN "source";
ALTER TABLE "study_profiles" DROP COLUMN "ai_day",
DROP COLUMN "ai_count",
DROP COLUMN "ai_tip";

-- DropEnum
DROP TYPE "PlannerSource";
