-- AlterTable
ALTER TABLE "LlmConfig" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LlmConfig" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing row as active
UPDATE "LlmConfig" SET "active" = true;
