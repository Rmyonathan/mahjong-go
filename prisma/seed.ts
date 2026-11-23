import "dotenv/config"
import {
  PrismaClient,
  type BoardTier,
  type FormResult,
} from "@prisma/client"
import bcrypt from "bcryptjs"

import { PLAYERS } from "../lib/mock/jade-data"
import {
  ACTIVE_SEASON,
  BOARD_STANDINGS,
  SEASON_KPI,
  WIN_METHODS_SEASON,
} from "../lib/mock/jade-board"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding JadeMahjong…")

  await prisma.handRecord.deleteMany()
  await prisma.sessionSeat.deleteMany()
  await prisma.gameSession.deleteMany()
  await prisma.boardStanding.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.meet.deleteMany()
  await prisma.user.deleteMany()
  await prisma.season.deleteMany()
  await prisma.player.deleteMany()

  for (const player of PLAYERS) {
    await prisma.player.create({
      data: {
        id: player.id,
        name: player.name,
        nickname: player.nickname,
        initials: player.initials,
        city: player.city,
        district: player.district,
        house: player.house,
        experienceLevelId: player.experienceLevelId,
        memberSince: new Date(player.memberSince),
        experienceXp: 0,
        skillRating: 1500,
      },
    })
  }

  await prisma.season.create({
    data: {
      id: ACTIVE_SEASON.id,
      label: ACTIVE_SEASON.label,
      rangeLabel: ACTIVE_SEASON.rangeLabel,
      sessionsPlayed: SEASON_KPI.sessionsPlayed,
      gamesPlayed: SEASON_KPI.gamesPlayed,
      hoursAtTable: SEASON_KPI.hoursAtTable,
      biggestHandPts: SEASON_KPI.biggestHand.points,
      biggestHandCombo: SEASON_KPI.biggestHand.combo,
      biggestHandPlayerId: SEASON_KPI.biggestHand.playerId,
      topComboName: SEASON_KPI.topCombo.name,
      topComboCount: SEASON_KPI.topCombo.count,
      hotStreakPlayerId: SEASON_KPI.hotStreak.playerId,
      hotStreak: SEASON_KPI.hotStreak.streak,
      selfDrawWins: WIN_METHODS_SEASON.selfDraw,
      discardWins: WIN_METHODS_SEASON.discard,
      isActive: true,
    },
  })

  for (const standing of BOARD_STANDINGS) {
    await prisma.boardStanding.create({
      data: {
        seasonId: ACTIVE_SEASON.id,
        playerId: standing.playerId,
        rank: standing.rank,
        board: standing.board as BoardTier,
        points: standing.points,
        wins: standing.wins,
        games: standing.games,
        winRate: standing.winRate,
        ptsPerWin: standing.ptsPerWin,
        bonus: standing.bonus,
        pen: standing.pen,
        biggestHand: standing.biggestHand,
        form: standing.form as FormResult[],
        streak: standing.streak,
        selfDraw: standing.selfDraw,
        discardWins: standing.discardWins,
      },
    })
  }

  const adminHash = await bcrypt.hash("getsuga39", 10)
  const proExpiry = new Date()
  proExpiry.setDate(proExpiry.getDate() + 365)

  const admin = await prisma.user.create({
    data: {
      email: "admin@jade.local",
      name: "Jade Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      membershipTier: "PRO",
      proExpiresAt: proExpiry,
      playerId: "hendra-wijaya",
    },
  })

  const memberHash = await bcrypt.hash("jade123", 10)
  const member = await prisma.user.create({
    data: {
      email: "sari@jade.local",
      name: "Sari Lestari",
      passwordHash: memberHash,
      role: "MEMBER",
      membershipTier: "PRO",
      proExpiresAt: proExpiry,
      playerId: "sari-lestari",
    },
  })

  const freeHash = await bcrypt.hash("jade123", 10)
  const freeMember = await prisma.user.create({
    data: {
      email: "andi@jade.local",
      name: "Andi Saputra",
      passwordHash: freeHash,
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "andi-saputra",
    },
  })

  const rina = await prisma.user.create({
    data: {
      email: "rina@jade.local",
      name: "Rina Marlina",
      passwordHash: freeHash,
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "rina-marlina",
    },
  })
  const eko = await prisma.user.create({
    data: {
      email: "eko@jade.local",
      name: "Eko Prasetyo",
      passwordHash: freeHash,
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "eko-prasetyo",
    },
  })

  // EDIT HERE — demo weekly meets for Schedule & Booking
  const friday = await prisma.meet.create({
    data: {
      title: "Friday Night Jade League",
      dateLabel: "Fri, 20 Nov",
      startTime: "19:00",
      endTime: "22:00",
      startsAt: new Date("2026-11-20T19:00:00+07:00"),
      endsAt: new Date("2026-11-20T22:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: "ADVANCED",
      maxSeats: 12,
      tables: 3,
      feeIdr: 50_000,
      status: "OPEN",
      hostId: admin.id,
    },
  })

  const guided = await prisma.meet.create({
    data: {
      title: "Saturday Afternoon Beginner Guided Table",
      dateLabel: "Sat, 21 Nov",
      startTime: "14:00",
      endTime: "17:00",
      startsAt: new Date("2026-11-21T14:00:00+07:00"),
      endsAt: new Date("2026-11-21T17:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: "GUIDED",
      maxSeats: 4,
      tables: 1,
      feeIdr: 75_000,
      status: "FULL",
      hostId: admin.id,
    },
  })

  await prisma.booking.createMany({
    data: [
      {
        meetId: guided.id,
        userId: member.id,
        status: "CONFIRMED",
        paymentMethod: "QRIS",
        seatNumber: 1,
        checkInCode: "JADE-GUID-SEED01",
      },
      {
        meetId: guided.id,
        userId: freeMember.id,
        status: "CONFIRMED",
        paymentMethod: "VENUE",
        seatNumber: 2,
        checkInCode: "JADE-GUID-SEED02",
      },
      {
        meetId: guided.id,
        userId: rina.id,
        status: "CONFIRMED",
        paymentMethod: "VENUE",
        seatNumber: 3,
        checkInCode: "JADE-GUID-SEED03",
      },
      {
        meetId: guided.id,
        userId: admin.id,
        status: "CONFIRMED",
        paymentMethod: "VENUE",
        seatNumber: 4,
        checkInCode: "JADE-GUID-SEED04",
      },
      {
        meetId: friday.id,
        userId: admin.id,
        status: "CONFIRMED",
        paymentMethod: "QRIS",
        seatNumber: 1,
        checkInCode: "JADE-FRI-SEED01",
      },
      {
        meetId: friday.id,
        userId: member.id,
        status: "CONFIRMED",
        paymentMethod: "VENUE",
        seatNumber: 2,
        checkInCode: "JADE-FRI-SEED02",
      },
    ],
  })

  await prisma.meet.create({
    data: {
      title: "Sunday Competitive MCR Ranking",
      dateLabel: "Sun, 22 Nov",
      startTime: "18:30",
      endTime: "22:00",
      startsAt: new Date("2026-11-22T18:30:00+07:00"),
      endsAt: new Date("2026-11-22T22:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: "MCR",
      maxSeats: 8,
      tables: 2,
      feeIdr: 60_000,
      status: "OPEN",
      hostId: admin.id,
    },
  })

  await prisma.meet.create({
    data: {
      title: "Tuesday Chill Tiles & Coffee",
      dateLabel: "Tue, 24 Nov",
      startTime: "19:00",
      endTime: "22:00",
      startsAt: new Date("2026-11-24T19:00:00+07:00"),
      endsAt: new Date("2026-11-24T22:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: "BEGINNER",
      maxSeats: 8,
      tables: 2,
      feeIdr: 40_000,
      status: "OPEN",
      hostId: admin.id,
    },
  })

  console.log("Seeded users:", {
    admin: admin.email,
    member: member.email,
    free: freeMember.email,
    rina: rina.email,
    eko: eko.email,
  })
  console.log(
    "No FINISHED game sessions seeded — leaderboard uses mock until a live table is ended.",
  )
  console.log("Done.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
