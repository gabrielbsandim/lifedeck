ALTER TABLE "scheduled_jobs" ADD COLUMN "dedup_key" TEXT;

CREATE UNIQUE INDEX "scheduled_jobs_dedup_key_key" ON "scheduled_jobs"("dedup_key");
