-- AlterTable
ALTER TABLE "opportunity_validations" ADD COLUMN     "first_outbound_ms" INTEGER,
ADD COLUMN     "first_return_ms" INTEGER,
ADD COLUMN     "second_outbound_ms" INTEGER,
ADD COLUMN     "second_return_ms" INTEGER;
