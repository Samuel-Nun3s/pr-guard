ALTER TABLE "Repository" ADD COLUMN "reviewMode" TEXT NOT NULL DEFAULT 'comment';
ALTER TABLE "LlmConfig" DROP COLUMN "reviewMode";
