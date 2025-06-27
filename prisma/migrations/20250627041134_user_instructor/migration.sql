/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `UserInstructor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserInstructor_userId_key" ON "UserInstructor"("userId");
