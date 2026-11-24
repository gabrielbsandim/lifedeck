-- CreateTable: dedup + rate-limit ledger for proactive nudges. One row per nudge
-- actually sent; `key` identifies the rule + target (e.g. carried_task:<taskId>).
CREATE TABLE "nudge_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: the ≤1/day cap looks up by (user, date)
CREATE INDEX "nudge_logs_user_id_date_idx" ON "nudge_logs"("user_id", "date");

-- CreateIndex: the per-target cooldown looks up by (user, key)
CREATE INDEX "nudge_logs_user_id_key_idx" ON "nudge_logs"("user_id", "key");

-- AddForeignKey
ALTER TABLE "nudge_logs" ADD CONSTRAINT "nudge_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
