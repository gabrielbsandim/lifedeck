-- AlterTable: store single-occurrence overrides of a recurring series
ALTER TABLE "calendar_events" ADD COLUMN "recurrence_master_external_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "original_starts_at" TIMESTAMP(3);
ALTER TABLE "calendar_events" ADD COLUMN "cancelled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: look up a series' overrides by its master external id
CREATE INDEX "calendar_events_owner_id_recurrence_master_external_id_idx" ON "calendar_events"("owner_id", "recurrence_master_external_id");
