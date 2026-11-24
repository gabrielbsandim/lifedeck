-- Concurrent pulls of one connection could insert the same remote event twice.
DROP INDEX IF EXISTS "calendar_events_connection_id_external_id_idx";

CREATE UNIQUE INDEX "calendar_events_connection_id_external_id_key" ON "calendar_events"("connection_id", "external_id");
