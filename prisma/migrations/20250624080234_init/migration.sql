-- CreateTable
CREATE TABLE "UserNewMember" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscription" TEXT,
    "status" TEXT,
    "action" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "UserNewMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNewMember_email_key" ON "UserNewMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserNewMember_userId_key" ON "UserNewMember"("userId");

-- AddForeignKey
ALTER TABLE "UserNewMember" ADD CONSTRAINT "UserNewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
