-- CreateTable: user habits tracked with streaks + an optional proactive check-in
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cadence" JSONB NOT NULL,
    "checkin_hour" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable: one completion mark per habit per civil date (YYYY-MM-DD text)
CREATE TABLE "habit_logs" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habits_owner_id_idx" ON "habits"("owner_id");

-- CreateIndex: the check-in sweep scans active habits with a check-in hour set
CREATE INDEX "habits_active_checkin_hour_idx" ON "habits"("active", "checkin_hour");

-- CreateIndex: one log per habit per day; also serves the streak lookup
CREATE UNIQUE INDEX "habit_logs_habit_id_date_key" ON "habit_logs"("habit_id", "date");

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
