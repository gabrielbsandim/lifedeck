-- Allow more than one calendar connection per user (e.g. personal + work).
ALTER TABLE "calendar_connections"
  ADD COLUMN "account_email" TEXT,
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- Replace the single-connection uniqueness with one that also keys on the
-- connected account, so a user can add a second Google account.
DROP INDEX "calendar_connections_owner_id_provider_key";
CREATE UNIQUE INDEX "calendar_connections_owner_id_provider_account_email_key" ON "calendar_connections"("owner_id", "provider", "account_email");
CREATE INDEX "calendar_connections_owner_id_provider_idx" ON "calendar_connections"("owner_id", "provider");

-- Tag each event with the connection it belongs to, so edits and deletes are
-- pushed back to the calendar the event actually lives in.
ALTER TABLE "calendar_events" ADD COLUMN "connection_id" TEXT;
CREATE INDEX "calendar_events_connection_id_external_id_idx" ON "calendar_events"("connection_id", "external_id");
