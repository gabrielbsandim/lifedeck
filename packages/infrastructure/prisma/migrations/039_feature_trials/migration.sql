-- A free trial of one entitlement (booking: 14 days), granted without a payment
-- gateway. The row stays after the trial ends so it cannot be restarted.
CREATE TABLE "feature_trials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entitlement" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_trials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_trials_user_id_entitlement_key" ON "feature_trials"("user_id", "entitlement");

ALTER TABLE "feature_trials" ADD CONSTRAINT "feature_trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
