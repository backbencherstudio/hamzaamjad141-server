/*
  Warnings:

  - The `action` column on the `add_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `add_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Action" AS ENUM ('active', 'inactive');

-- AlterTable
ALTER TABLE "add_logs" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "Action" NOT NULL DEFAULT 'active';
