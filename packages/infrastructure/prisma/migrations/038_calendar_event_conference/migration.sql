-- A booking with a Google Meet location asks Google for a call on push; the
-- link Google returns is stored so emails and the manage page can show it.
ALTER TABLE "calendar_events" ADD COLUMN "conference_requested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "calendar_events" ADD COLUMN "conference_url" TEXT;
