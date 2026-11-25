-- The Sign in with Apple refresh token, encrypted, kept so deleting the account
-- can revoke the grant as App Store review requires.
CREATE TABLE "apple_grants" (
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apple_grants_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "apple_grants" ADD CONSTRAINT "apple_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
