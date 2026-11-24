-- CreateTable
CREATE TABLE "channel_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "address" TEXT,
    "pairing_code" TEXT,
    "pairing_expires_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_identities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "channel_identities_user_id_channel_key" ON "channel_identities"("user_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "channel_identities_channel_address_key" ON "channel_identities"("channel", "address");

-- CreateIndex
CREATE INDEX "channel_identities_channel_pairing_code_idx" ON "channel_identities"("channel", "pairing_code");

-- AddForeignKey
ALTER TABLE "channel_identities" ADD CONSTRAINT "channel_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
