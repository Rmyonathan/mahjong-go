-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "MeetBoardType" AS ENUM ('BEGINNER', 'ADVANCED', 'MCR', 'GUIDED');

-- CreateEnum
CREATE TYPE "MeetStatus" AS ENUM ('OPEN', 'FULL', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'WAITLIST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS', 'VENUE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "membershipTier" "MembershipTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Meet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateLabel" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "boardType" "MeetBoardType" NOT NULL,
    "maxSeats" INTEGER NOT NULL,
    "tables" INTEGER NOT NULL DEFAULT 1,
    "feeIdr" INTEGER NOT NULL,
    "proEarlyBirdUntil" TIMESTAMP(3),
    "proOnly" BOOLEAN NOT NULL DEFAULT false,
    "status" "MeetStatus" NOT NULL DEFAULT 'OPEN',
    "hostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "meetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "paymentMethod" "PaymentMethod",
    "seatNumber" INTEGER,
    "checkInCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meet_startsAt_status_idx" ON "Meet"("startsAt", "status");

-- CreateIndex
CREATE INDEX "Booking_meetId_status_idx" ON "Booking"("meetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_meetId_userId_key" ON "Booking"("meetId", "userId");

-- AddForeignKey
ALTER TABLE "Meet" ADD CONSTRAINT "Meet_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_meetId_fkey" FOREIGN KEY ("meetId") REFERENCES "Meet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
