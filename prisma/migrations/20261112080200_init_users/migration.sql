-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FARMER', 'OFFICER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "role" "UserRole" NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
