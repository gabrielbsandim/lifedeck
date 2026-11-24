-- AlterTable: durable per-user assistant memory (home/work, routine, people, notes)
ALTER TABLE "users" ADD COLUMN "assistant_profile" JSONB;
