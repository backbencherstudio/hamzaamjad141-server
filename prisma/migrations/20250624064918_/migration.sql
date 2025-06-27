-- CreateTable
CREATE TABLE "Instructor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT,
    "action" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "add_logs" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "aircrafttype" TEXT NOT NULL,
    "tailNumber" TEXT NOT NULL,
    "flightTime" INTEGER NOT NULL,
    "pictime" TEXT,
    "dualrcv" TEXT,
    "daytime" TEXT NOT NULL,
    "nightime" TEXT NOT NULL,
    "ifrtime" TEXT NOT NULL,
    "crossCountry" TEXT NOT NULL,
    "takeoffs" INTEGER NOT NULL,
    "landings" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "instructorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "add_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_email_key" ON "Instructor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_userId_key" ON "Instructor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "add_logs_userId_key" ON "add_logs"("userId");

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_logs" ADD CONSTRAINT "add_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_logs" ADD CONSTRAINT "add_logs_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
