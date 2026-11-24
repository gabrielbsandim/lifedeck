-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "recurring_task_id" TEXT;

-- CreateTable
CREATE TABLE "recurring_tasks" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_tasks_owner_id_idx" ON "recurring_tasks"("owner_id");

-- CreateIndex
CREATE INDEX "tasks_recurring_task_id_idx" ON "tasks"("recurring_task_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurring_task_id_fkey" FOREIGN KEY ("recurring_task_id") REFERENCES "recurring_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

