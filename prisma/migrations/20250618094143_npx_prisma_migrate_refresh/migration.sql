/*
  Warnings:

  - Added the required column `name` to the `Ucode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Ucode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Ucode" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL;
