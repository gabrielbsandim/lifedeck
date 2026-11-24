-- CreateTable
CREATE TABLE "checkout_intents" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkout_intents_provider_reference_idx" ON "checkout_intents"("provider", "reference");
