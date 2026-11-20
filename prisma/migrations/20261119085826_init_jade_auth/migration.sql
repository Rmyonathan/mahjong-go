-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "BoardTier" AS ENUM ('beginner', 'advanced', 'mcr');

-- CreateEnum
CREATE TYPE "FormResult" AS ENUM ('W', 'L', 'D');

-- CreateEnum
CREATE TYPE "WinMethod" AS ENUM ('self_draw', 'discard');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('finished', 'live');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "house" TEXT NOT NULL,
    "experienceLevelId" TEXT NOT NULL,
    "memberSince" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rangeLabel" TEXT NOT NULL,
    "sessionsPlayed" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL,
    "hoursAtTable" DOUBLE PRECISION NOT NULL,
    "biggestHandPts" INTEGER NOT NULL,
    "biggestHandCombo" TEXT NOT NULL,
    "biggestHandPlayerId" TEXT NOT NULL,
    "topComboName" TEXT NOT NULL,
    "topComboCount" INTEGER NOT NULL,
    "hotStreakPlayerId" TEXT NOT NULL,
    "hotStreak" INTEGER NOT NULL,
    "selfDrawWins" INTEGER NOT NULL,
    "discardWins" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardStanding" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "board" "BoardTier" NOT NULL,
    "points" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "games" INTEGER NOT NULL,
    "winRate" DOUBLE PRECISION NOT NULL,
    "ptsPerWin" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,
    "pen" INTEGER NOT NULL,
    "biggestHand" INTEGER NOT NULL,
    "form" "FormResult"[],
    "streak" INTEGER NOT NULL,
    "selfDraw" INTEGER NOT NULL,
    "discardWins" INTEGER NOT NULL,

    CONSTRAINT "BoardStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'finished',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "games" INTEGER NOT NULL,
    "handsWon" INTEGER NOT NULL,
    "draws" INTEGER NOT NULL,
    "biggestHand" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL,
    "selfDrawWins" INTEGER NOT NULL,
    "discardWins" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSeat" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seatOrder" INTEGER NOT NULL,

    CONSTRAINT "SessionSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionStanding" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "net" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "selfDraw" INTEGER NOT NULL,
    "dealtIn" INTEGER NOT NULL,
    "form" "FormResult"[],

    CONSTRAINT "SessionStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionHighlight" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "biggestHandPlayerId" TEXT NOT NULL,
    "biggestHandPoints" INTEGER NOT NULL,
    "biggestHandCombo" TEXT NOT NULL,
    "biggestPayoutPlayerId" TEXT NOT NULL,
    "biggestPayoutPoints" INTEGER NOT NULL,
    "mostWinsPlayerId" TEXT NOT NULL,
    "mostWins" INTEGER NOT NULL,
    "longestDealPlayerId" TEXT NOT NULL,
    "longestDealHands" INTEGER NOT NULL,
    "mostDealtInPlayerId" TEXT NOT NULL,
    "mostDealtIn" INTEGER NOT NULL,

    CONSTRAINT "SessionHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimedCombo" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ClaimedCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hand" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "handNo" INTEGER NOT NULL,
    "winnerId" TEXT NOT NULL,
    "method" "WinMethod" NOT NULL,
    "dealtById" TEXT,
    "tileIds" TEXT[],
    "winningTileId" TEXT NOT NULL,
    "bonusTileIds" TEXT[],

    CONSTRAINT "Hand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandCombo" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fan" INTEGER NOT NULL,

    CONSTRAINT "HandCombo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandDelta" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,

    CONSTRAINT "HandDelta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE INDEX "BoardStanding_seasonId_board_rank_idx" ON "BoardStanding"("seasonId", "board", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "BoardStanding_seasonId_playerId_key" ON "BoardStanding"("seasonId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSeat_sessionId_playerId_key" ON "SessionSeat"("sessionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSeat_sessionId_seatOrder_key" ON "SessionSeat"("sessionId", "seatOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SessionStanding_sessionId_playerId_key" ON "SessionStanding"("sessionId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionHighlight_sessionId_key" ON "SessionHighlight"("sessionId");

-- CreateIndex
CREATE INDEX "ClaimedCombo_sessionId_idx" ON "ClaimedCombo"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Hand_sessionId_handNo_key" ON "Hand"("sessionId", "handNo");

-- CreateIndex
CREATE UNIQUE INDEX "HandDelta_handId_playerId_key" ON "HandDelta"("handId", "playerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardStanding" ADD CONSTRAINT "BoardStanding_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardStanding" ADD CONSTRAINT "BoardStanding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeat" ADD CONSTRAINT "SessionSeat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSeat" ADD CONSTRAINT "SessionSeat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionStanding" ADD CONSTRAINT "SessionStanding_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionStanding" ADD CONSTRAINT "SessionStanding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionHighlight" ADD CONSTRAINT "SessionHighlight_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimedCombo" ADD CONSTRAINT "ClaimedCombo_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hand" ADD CONSTRAINT "Hand_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hand" ADD CONSTRAINT "Hand_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hand" ADD CONSTRAINT "Hand_dealtById_fkey" FOREIGN KEY ("dealtById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandCombo" ADD CONSTRAINT "HandCombo_handId_fkey" FOREIGN KEY ("handId") REFERENCES "Hand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandDelta" ADD CONSTRAINT "HandDelta_handId_fkey" FOREIGN KEY ("handId") REFERENCES "Hand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandDelta" ADD CONSTRAINT "HandDelta_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
