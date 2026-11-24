-- Events the remote calendar shows as free, or that the owner declined, stay
-- visible but stop blocking slots. Existing rows keep blocking until re-synced.
ALTER TABLE "calendar_events" ADD COLUMN "busy" BOOLEAN NOT NULL DEFAULT true;
