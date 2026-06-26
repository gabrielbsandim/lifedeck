-- CreateTable
CREATE TABLE "subtasks" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'pending',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subtasks_task_id_idx" ON "subtasks"("task_id");

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
