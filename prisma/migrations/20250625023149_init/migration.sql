-- CreateTable
CREATE TABLE "pilot_weather" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pilot_weather_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pilot_weather_userId_key" ON "pilot_weather"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pilot_weather_location_key" ON "pilot_weather"("location");

-- AddForeignKey
ALTER TABLE "pilot_weather" ADD CONSTRAINT "pilot_weather_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
