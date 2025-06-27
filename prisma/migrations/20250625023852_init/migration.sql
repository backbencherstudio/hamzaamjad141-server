/*
  Warnings:

  - You are about to drop the column `location` on the `pilot_weather` table. All the data in the column will be lost.
  - Added the required column `locationId` to the `pilot_weather` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "pilot_weather_location_key";

-- AlterTable
ALTER TABLE "pilot_weather" DROP COLUMN "location",
ADD COLUMN     "locationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- AddForeignKey
ALTER TABLE "pilot_weather" ADD CONSTRAINT "pilot_weather_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
