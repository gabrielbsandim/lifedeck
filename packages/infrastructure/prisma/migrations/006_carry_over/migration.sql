-- AlterTable
ALTER TABLE "users" ADD COLUMN "carry_over_mode" TEXT NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "carried_from_date" TIMESTAMP(3),
ADD COLUMN "carried_forward_at" TIMESTAMP(3);
