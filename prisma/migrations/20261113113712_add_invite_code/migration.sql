ALTER TABLE "Household" ADD COLUMN "inviteCode" TEXT;
UPDATE "Household" SET "inviteCode" = md5(random()::text || id);
ALTER TABLE "Household" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "Household_inviteCode_key" ON "Household"("inviteCode");
