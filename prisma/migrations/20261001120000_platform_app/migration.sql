-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('start', 'web', 'design', 'code', 'mobile', 'games');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'submitted', 'reviewed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConsentType" ADD VALUE 'age_confirm';
ALTER TYPE "ConsentType" ADD VALUE 'immediate_access';

-- DropForeignKey
ALTER TABLE "consents" DROP CONSTRAINT "consents_child_id_fkey";

-- DropIndex
DROP INDEX "homework_lesson_id_idx";

-- AlterTable
ALTER TABLE "consents" ADD COLUMN     "subscription_id" UUID;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "category" "CourseCategory" NOT NULL DEFAULT 'code';

-- AlterTable
ALTER TABLE "homework" ADD COLUMN     "due_days" INTEGER NOT NULL DEFAULT 7,
ALTER COLUMN "max_score" SET DEFAULT 10;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "xp" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "due_at" TIMESTAMP(3),
ADD COLUMN     "needs_teacher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminded_at" TIMESTAMP(3),
ADD COLUMN     "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
ALTER COLUMN "submitted_at" DROP NOT NULL,
ALTER COLUMN "submitted_at" DROP DEFAULT;

-- Backfill: наявні відповіді вже здані (і, якщо є reviewed_at, перевірені)
UPDATE "submissions" SET "status" = CASE WHEN "reviewed_at" IS NOT NULL THEN 'reviewed'::"SubmissionStatus" ELSE 'submitted'::"SubmissionStatus" END
WHERE "submitted_at" IS NOT NULL;

-- AlterTable (amount і order_reference спершу nullable, щоб заповнити наявні рядки)
ALTER TABLE "subscriptions" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "course_id" UUID,
ADD COLUMN     "order_reference" TEXT,
ADD COLUMN     "reminded_for_period_end" TIMESTAMP(3),
ADD COLUMN     "student_id" UUID;

-- Backfill: сума = ціна тарифу, номер замовлення = LEGACY-<id>
UPDATE "subscriptions" s SET "amount" = p."price" FROM "plans" p WHERE p."id" = s."plan_id" AND s."amount" IS NULL;
UPDATE "subscriptions" SET "order_reference" = 'LEGACY-' || "id"::text WHERE "order_reference" IS NULL;
-- Backfill: якщо в платника рівно одна дитина — підписка належить їй
UPDATE "subscriptions" s SET "student_id" = c."id"
FROM "users" c
WHERE c."parent_id" = s."user_id" AND s."student_id" IS NULL
  AND (SELECT count(*) FROM "users" c2 WHERE c2."parent_id" = s."user_id") = 1;

ALTER TABLE "subscriptions" ALTER COLUMN "amount" SET NOT NULL,
ALTER COLUMN "order_reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "homework_lesson_id_key" ON "homework"("lesson_id");

-- CreateIndex
CREATE INDEX "submissions_status_due_at_idx" ON "submissions"("status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_order_reference_key" ON "subscriptions"("order_reference");

-- CreateIndex
CREATE INDEX "subscriptions_student_id_idx" ON "subscriptions"("student_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

