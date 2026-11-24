-- Per-user reminder channel preferences. In-app always fires; WhatsApp stays on
-- by default (still gated by a linked number), email is opt-in.
ALTER TABLE "users"
  ADD COLUMN "reminder_email" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reminder_whatsapp" BOOLEAN NOT NULL DEFAULT true;
