/*
  Warnings:

  - A unique constraint covering the columns `[userId,locationId]` on the table `pilot_weather` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "pilot_weather_userId_locationId_key" ON "pilot_weather"("userId", "locationId");
