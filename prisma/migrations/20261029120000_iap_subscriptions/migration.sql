-- Підписки з магазинів (Apple In-App Purchase, Google Play Billing) поряд з WayForPay.
CREATE TYPE "BillingProvider" AS ENUM ('wayforpay', 'apple', 'google');

ALTER TABLE "subscriptions"
  ADD COLUMN "provider" "BillingProvider" NOT NULL DEFAULT 'wayforpay',
  ADD COLUMN "external_id" TEXT,
  ADD COLUMN "store_product_id" TEXT,
  ADD COLUMN "slot" INTEGER;

CREATE UNIQUE INDEX "subscriptions_external_id_key" ON "subscriptions"("external_id");
