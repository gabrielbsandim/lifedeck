-- DropIndex
DROP INDEX "lists_owner_id_idx";

-- DropIndex
DROP INDEX "recurring_tasks_owner_id_idx";

-- CreateIndex
CREATE INDEX "lists_owner_id_created_at_idx" ON "lists"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "recurring_tasks_owner_id_created_at_idx" ON "recurring_tasks"("owner_id", "created_at");
