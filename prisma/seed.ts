import "dotenv/config"
import { PrismaClient, type MeetBoardType } from "@prisma/client"
import bcrypt from "bcryptjs"

import { PLAYERS } from "../lib/mock/jade-data"
import { ACTIVE_SEASON } from "../lib/mock/jade-board"

const prisma = new PrismaClient()

async function main() {
  console.log(
    "Seeding JadeMahjong (accounts + schedule only — live sessions & tournaments kept)…",
  )

  // Demo schedule only — never wipe GameSessions, board standings, or tournaments.
  await prisma.booking.deleteMany()
  await prisma.meet.deleteMany()

  for (const player of PLAYERS) {
    await prisma.player.upsert({
      where: { id: player.id },
      create: {
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
      update: {
        name: player.name,
        nickname: player.nickname,
        initials: player.initials,
        city: player.city,
        district: player.district,
        house: player.house,
        experienceLevelId: player.experienceLevelId,
      },
    })
  }

  await prisma.season.upsert({
    where: { id: ACTIVE_SEASON.id },
    create: {
      id: ACTIVE_SEASON.id,
      label: ACTIVE_SEASON.label,
      rangeLabel: ACTIVE_SEASON.rangeLabel,
      sessionsPlayed: 0,
      gamesPlayed: 0,
      hoursAtTable: 0,
      biggestHandPts: 0,
      biggestHandCombo: "",
      biggestHandPlayerId: PLAYERS[0]?.id ?? "hendra-wijaya",
      topComboName: "",
      topComboCount: 0,
      hotStreakPlayerId: PLAYERS[0]?.id ?? "hendra-wijaya",
      hotStreak: 0,
      selfDrawWins: 0,
      discardWins: 0,
      isActive: true,
    },
    update: {
      label: ACTIVE_SEASON.label,
      rangeLabel: ACTIVE_SEASON.rangeLabel,
      isActive: true,
    },
  })

  const passwordHash = await bcrypt.hash("jade123", 10)
  const proExpiry = new Date()
  proExpiry.setDate(proExpiry.getDate() + 365)

  type SeedUser = {
    email: string
    name: string
    role: "ADMIN" | "MEMBER"
    membershipTier: "FREE" | "PRO"
    playerId: string
    proExpiresAt?: Date
  }

  const seedUsers: SeedUser[] = [
    {
      email: "admin@jade.local",
      name: "Jade Admin",
      role: "ADMIN",
      membershipTier: "PRO",
      playerId: "hendra-wijaya",
      proExpiresAt: proExpiry,
    },
    {
      email: "sari@jade.local",
      name: "Sari Lestari",
      role: "MEMBER",
      membershipTier: "PRO",
      playerId: "sari-lestari",
      proExpiresAt: proExpiry,
    },
    {
      email: "andi@jade.local",
      name: "Andi Saputra",
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "andi-saputra",
    },
    {
      email: "rina@jade.local",
      name: "Rina Marlina",
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "rina-marlina",
    },
    {
      email: "eko@jade.local",
      name: "Eko Prasetyo",
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "eko-prasetyo",
    },
    {
      email: "dewi@jade.local",
      name: "Dewi Anggraini",
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "dewi-anggraini",
    },
    {
      email: "bambang@jade.local",
      name: "Bambang Sutopo",
      role: "MEMBER",
      membershipTier: "FREE",
      playerId: "bambang-sutopo",
    },
    {
      email: "yudi@jade.local",
      name: "Yudi Kurniawan",
      role: "MEMBER",
      membershipTier: "PRO",
      playerId: "yudi-kurniawan",
      proExpiresAt: proExpiry,
    },
  ]

  for (const account of seedUsers) {
    await prisma.user.upsert({
      where: { email: account.email },
      create: {
        email: account.email,
        name: account.name,
        passwordHash,
        role: account.role,
        membershipTier: account.membershipTier,
        playerId: account.playerId,
        proExpiresAt: account.proExpiresAt ?? null,
      },
      update: {
        name: account.name,
        passwordHash,
        role: account.role,
        membershipTier: account.membershipTier,
        playerId: account.playerId,
        proExpiresAt: account.proExpiresAt ?? null,
      },
    })
  }

  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@jade.local" },
  })
  const member = await prisma.user.findUniqueOrThrow({
    where: { email: "sari@jade.local" },
  })
  const freeMember = await prisma.user.findUniqueOrThrow({
    where: { email: "andi@jade.local" },
  })

  const board = (value: MeetBoardType) => value

  const friday = await prisma.meet.create({
    data: {
      title: "Friday Night Jade League",
      dateLabel: "Fri, 20 Nov",
      startTime: "19:00",
      endTime: "22:00",
      startsAt: new Date("2026-11-20T19:00:00+07:00"),
      endsAt: new Date("2026-11-20T22:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: board("ADVANCED"),
      maxSeats: 12,
      tables: 3,
      feeIdr: 50_000,
      status: "OPEN",
      hostId: admin.id,
      captainId: admin.id,
      scanLimit: null,
    },
  })

  await prisma.meet.create({
    data: {
      title: "Saturday Afternoon Beginner Guided Table",
      dateLabel: "Sat, 21 Nov",
      startTime: "14:00",
      endTime: "17:00",
      startsAt: new Date("2026-11-21T14:00:00+07:00"),
      endsAt: new Date("2026-11-21T17:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: board("GUIDED"),
      maxSeats: 8,
      tables: 2,
      feeIdr: 35_000,
      status: "OPEN",
      hostId: admin.id,
      captainId: admin.id,
      scanLimit: null,
    },
  })

  await prisma.booking.createMany({
    data: [
      {
        meetId: friday.id,
        userId: member.id,
        status: "CONFIRMED",
        paymentMethod: "QRIS",
        seatNumber: 1,
        checkInCode: "JADE-FRI-SEED01",
      },
      {
        meetId: friday.id,
        userId: freeMember.id,
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
      dateLabel: "Sun, 29 Nov",
      startTime: "18:30",
      endTime: "22:00",
      startsAt: new Date("2026-11-29T18:30:00+07:00"),
      endsAt: new Date("2026-11-29T22:00:00+07:00"),
      location: "Jade Mahjong Lounge, Bandar Lampung",
      boardType: board("MCR"),
      maxSeats: 8,
      tables: 2,
      feeIdr: 60_000,
      status: "OPEN",
      hostId: admin.id,
      captainId: admin.id,
      scanLimit: null,
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
      boardType: board("BEGINNER"),
      maxSeats: 8,
      tables: 2,
      feeIdr: 40_000,
      status: "OPEN",
      hostId: admin.id,
      captainId: admin.id,
      scanLimit: null,
    },
  })

  await prisma.meet.create({
    data: {
      title: "Andi's House Casual",
      dateLabel: "Wed, 25 Nov",
      startTime: "20:00",
      endTime: "23:00",
      startsAt: new Date("2026-11-25T20:00:00+07:00"),
      endsAt: new Date("2026-11-25T23:00:00+07:00"),
      location: "Kedaton · Living room table",
      boardType: board("BEGINNER"),
      maxSeats: 4,
      tables: 1,
      feeIdr: 0,
      status: "OPEN",
      hostId: freeMember.id,
      captainId: freeMember.id,
      scanLimit: 3,
    },
  })

  await prisma.meet.create({
    data: {
      title: "Sari's Pro Study Table",
      dateLabel: "Thu, 26 Nov",
      startTime: "19:30",
      endTime: "22:30",
      startsAt: new Date("2026-11-26T19:30:00+07:00"),
      endsAt: new Date("2026-11-26T22:30:00+07:00"),
      location: "Teluk Betung · Cafe nook",
      boardType: board("ADVANCED"),
      maxSeats: 4,
      tables: 1,
      feeIdr: 25_000,
      status: "OPEN",
      hostId: member.id,
      captainId: member.id,
      scanLimit: null,
    },
  })

  console.log(
    "Seeded accounts + demo meets. Leaderboard uses finished live sessions only (no mock board).",
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