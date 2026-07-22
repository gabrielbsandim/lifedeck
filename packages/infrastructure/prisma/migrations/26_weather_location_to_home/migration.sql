-- Weather now uses the assistant's Home location instead of a separate field.
-- Backfill Home from the standalone weather location wherever Home is not yet
-- set, so no saved city is lost, then drop the now-unused column.
UPDATE "users"
SET "assistant_profile" =
    COALESCE("assistant_profile", '{}'::jsonb)
    || jsonb_build_object('homeLocation', "weather_location")
WHERE "weather_location" IS NOT NULL
  AND (
    "assistant_profile" IS NULL
    OR "assistant_profile" ->> 'homeLocation' IS NULL
    OR "assistant_profile" ->> 'homeLocation' = ''
  );

ALTER TABLE "users" DROP COLUMN "weather_location";
