-- CreateTable
CREATE TABLE "login_attempts" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "window_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("key")
);
