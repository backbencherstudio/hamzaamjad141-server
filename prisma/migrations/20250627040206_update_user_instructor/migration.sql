/*
  Warnings:

  - A unique constraint covering the columns `[insturctorId]` on the table `UserInstructor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `insturctorId` to the `UserInstructor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserInstructor" ADD COLUMN     "insturctorId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserInstructor_insturctorId_key" ON "UserInstructor"("insturctorId");

-- AddForeignKey
ALTER TABLE "UserInstructor" ADD CONSTRAINT "UserInstructor_insturctorId_fkey" FOREIGN KEY ("insturctorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
