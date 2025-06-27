-- DropForeignKey
ALTER TABLE "add_logs" DROP CONSTRAINT "add_logs_instructorId_fkey";

-- CreateTable
CREATE TABLE "UserInstructor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT,
    "action" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInstructor_email_key" ON "UserInstructor"("email");

-- AddForeignKey
ALTER TABLE "UserInstructor" ADD CONSTRAINT "UserInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "add_logs" ADD CONSTRAINT "add_logs_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "UserInstructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
