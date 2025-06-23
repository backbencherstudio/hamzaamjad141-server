-- CreateEnum
CREATE TYPE "Licese" AS ENUM ('NO_LICENCE', 'SPL', 'PPL', 'CPL', 'ATPL', 'CH');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "license" "Licese" NOT NULL DEFAULT 'NO_LICENCE';
