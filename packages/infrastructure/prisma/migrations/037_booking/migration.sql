-- CreateTable
CREATE TABLE "booking_pages" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "headline" TEXT,
    "timezone" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "cancel_notice_min" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_min" INTEGER NOT NULL,
    "slot_step_min" INTEGER NOT NULL,
    "buffer_before_min" INTEGER NOT NULL,
    "buffer_after_min" INTEGER NOT NULL,
    "min_notice_min" INTEGER NOT NULL,
    "max_horizon_days" INTEGER NOT NULL,
    "max_per_day" INTEGER,
    "location" JSONB NOT NULL,
    "price_label" TEXT,
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_overrides" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "windows" JSONB NOT NULL,

    CONSTRAINT "availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_clients" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "calendar_event_id" TEXT,
    "client_timezone" TEXT,
    "note" TEXT,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_pages_owner_id_key" ON "booking_pages"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_pages_slug_key" ON "booking_pages"("slug");

-- CreateIndex
CREATE INDEX "booking_services_page_id_position_idx" ON "booking_services"("page_id", "position");

-- CreateIndex
CREATE INDEX "availability_rules_page_id_idx" ON "availability_rules"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "availability_overrides_page_id_date_key" ON "availability_overrides"("page_id", "date");

-- CreateIndex
CREATE INDEX "booking_clients_owner_id_email_idx" ON "booking_clients"("owner_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "booking_clients_owner_id_phone_key" ON "booking_clients"("owner_id", "phone");

-- CreateIndex
CREATE INDEX "bookings_owner_id_starts_at_idx" ON "bookings"("owner_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_client_id_idx" ON "bookings"("client_id");

-- CreateIndex
CREATE INDEX "bookings_calendar_event_id_idx" ON "bookings"("calendar_event_id");

-- AddForeignKey
ALTER TABLE "booking_pages" ADD CONSTRAINT "booking_pages_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "booking_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "booking_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_overrides" ADD CONSTRAINT "availability_overrides_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "booking_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_clients" ADD CONSTRAINT "booking_clients_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "booking_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "booking_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "calendar_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Two holding bookings of one host never overlap, even when two clients race
-- for the same slot. Columns are timestamp without time zone, hence tsrange.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("owner_id" WITH =, tsrange("starts_at", "ends_at") WITH &&)
  WHERE ("status" IN ('pending', 'confirmed'));
