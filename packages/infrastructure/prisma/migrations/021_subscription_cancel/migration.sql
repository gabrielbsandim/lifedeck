-- Track a pending cancellation so the app can show "cancels on <date>" and let
-- users cancel their own plan without contacting support.
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
