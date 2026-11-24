-- AlterTable
ALTER TABLE "calendar_events" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "calendar_events" ADD COLUMN "external_id" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "etag" TEXT;
ALTER TABLE "calendar_events" ADD COLUMN "synced_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "calendar_events_owner_id_external_id_idx" ON "calendar_events"("owner_id", "external_id");

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,
    "calendar_id" TEXT NOT NULL DEFAULT 'primary',
    "sync_token" TEXT,
    "channel_id" TEXT,
    "resource_id" TEXT,
    "channel_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_owner_id_provider_key" ON "calendar_connections"("owner_id", "provider");

-- CreateIndex
CREATE INDEX "calendar_connections_channel_id_idx" ON "calendar_connections"("channel_id");

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
