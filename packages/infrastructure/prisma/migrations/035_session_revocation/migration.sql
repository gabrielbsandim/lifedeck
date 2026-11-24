-- Session tokens issued before this instant are rejected (password change, sign out everywhere).
ALTER TABLE "users" ADD COLUMN "sessions_valid_from" TIMESTAMP(3);
