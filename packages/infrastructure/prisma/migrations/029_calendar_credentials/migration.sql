-- Multi-provider calendar credentials: OAuth providers (Google) keep a refresh
-- token and an access-token expiry, but providers that authenticate with a
-- static secret (Apple app-specific password, cal.com API key) have neither.
-- Relax both columns to nullable so a static credential stores just the secret
-- in access_token with no placeholder sentinels.
ALTER TABLE "calendar_connections" ALTER COLUMN "refresh_token" DROP NOT NULL;
ALTER TABLE "calendar_connections" ALTER COLUMN "token_expires_at" DROP NOT NULL;
