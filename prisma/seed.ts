import "dotenv/config"
import {
  PrismaClient,
  type BoardTier,
  type FormResult,
  type WinMethod,
} from "@prisma/client"
import bcrypt from "bcryptjs"

import { PLAYERS } from "../lib/mock/jade-data"
import {
  ACTIVE_SEASON,
  BOARD_STANDINGS,
  RECENT_SESSIONS,
  SEASON_KPI,
  SESSION_DETAILS,
  WIN_METHODS_SEASON,
} from "../lib/mock/jade-board"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding JadeMahjong…")

  await prisma.handDelta.deleteMany()
  await prisma.handCombo.deleteMany()
  await prisma.hand.deleteMany()
  await prisma.claimedCombo.deleteMany()
  await prisma.sessionHighlight.deleteMany()
  await prisma.sessionStanding.deleteMany()
  await prisma.sessionSeat.deleteMany()
  await prisma.gameSession.deleteMany()
  await prisma.boardStanding.deleteMany()
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

  for (const detail of Object.values(SESSION_DETAILS)) {
    await prisma.gameSession.create({
      data: {
        id: detail.id,
        seasonId: detail.seasonId,
        title: detail.title,
        venueName: detail.venueName,
        district: detail.district,
        startedAt: new Date(detail.startedAt),
        endedAt: new Date(detail.endedAt),
        status: detail.status,
        seats: detail.seats,
        games: detail.games,
        handsWon: detail.handsWon,
        draws: detail.draws,
        biggestHand: detail.biggestHand,
        durationMinutes: detail.durationMinutes,
        winnerId: detail.standings[0]?.playerId ?? detail.playerIds[0],
        selfDrawWins: detail.winMethods.selfDraw,
        discardWins: detail.winMethods.discard,
        seatPlayers: {
          create: detail.playerIds.map((playerId, index) => ({
            playerId,
            seatOrder: index,
          })),
        },
        standings: {
          create: detail.standings.map((standing) => ({
            playerId: standing.playerId,
            rank: standing.rank,
            net: standing.net,
            wins: standing.wins,
            selfDraw: standing.selfDraw,
            dealtIn: standing.dealtIn,
            form: standing.form as FormResult[],
          })),
        },
        highlights: {
          create: {
            biggestHandPlayerId: detail.highlights.biggestHand.playerId,
            biggestHandPoints: detail.highlights.biggestHand.points,
            biggestHandCombo: detail.highlights.biggestHand.combo,
            biggestPayoutPlayerId: detail.highlights.biggestPayout.playerId,
            biggestPayoutPoints: detail.highlights.biggestPayout.points,
            mostWinsPlayerId: detail.highlights.mostWins.playerId,
            mostWins: detail.highlights.mostWins.wins,
            longestDealPlayerId: detail.highlights.longestDeal.playerId,
            longestDealHands: detail.highlights.longestDeal.hands,
            mostDealtInPlayerId: detail.highlights.mostDealtIn.playerId,
            mostDealtIn: detail.highlights.mostDealtIn.count,
          },
        },
        claimedCombos: {
          create: detail.claimedCombos.map((combo) => ({
            label: combo.label,
            count: combo.count,
          })),
        },
      },
    })

    for (const hand of detail.hands) {
      const method: WinMethod =
        hand.method === "self-draw" ? "self_draw" : "discard"
      await prisma.hand.create({
        data: {
          id: hand.id,
          sessionId: detail.id,
          handNo: hand.handNo,
          winnerId: hand.winnerId,
          method,
          dealtById: hand.dealtById,
          tileIds: hand.tileIds,
          winningTileId: hand.winningTileId,
          bonusTileIds: hand.bonusTileIds,
          combos: {
            create: hand.combos.map((combo) => ({
              label: combo.label,
              fan: combo.fan,
            })),
          },
          deltas: {
            create: Object.entries(hand.deltas).map(([playerId, delta]) => ({
              playerId,
              delta,
            })),
          },
        },
      })
    }
  }

  // Recent sessions that don't have full detail yet.
  for (const card of RECENT_SESSIONS) {
    const exists = await prisma.gameSession.findUnique({ where: { id: card.id } })
    if (exists) continue
    await prisma.gameSession.create({
      data: {
        id: card.id,
        seasonId: ACTIVE_SEASON.id,
        title: card.title,
        venueName: card.venueName,
        district: "Bandar Lampung",
        startedAt: new Date(card.startedAt),
        endedAt: new Date(card.endedAt),
        status: "finished",
        seats: 4,
        games: card.games,
        handsWon: card.games,
        draws: 0,
        biggestHand: 0,
        durationMinutes: card.durationMinutes,
        winnerId: card.winnerId,
        selfDrawWins: 0,
        discardWins: 0,
        seatPlayers: {
          create: [
            { playerId: card.winnerId, seatOrder: 0 },
            { playerId: "sari-lestari", seatOrder: 1 },
            { playerId: "lim-wie-hong", seatOrder: 2 },
            { playerId: "dewi-anggraini", seatOrder: 3 },
          ].filter(
            (seat, index, arr) =>
              arr.findIndex((entry) => entry.playerId === seat.playerId) === index,
          ),
        },
      },
    })
  }

  const adminHash = await bcrypt.hash("getsuga39", 10)
  await prisma.user.create({
    data: {
      email: "admin@jade.local",
      name: "Jade Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      playerId: "hendra-wijaya",
    },
  })

  const memberHash = await bcrypt.hash("jade123", 10)
  await prisma.user.create({
    data: {
      email: "sari@jade.local",
      name: "Sari Lestari",
      passwordHash: memberHash,
      role: "MEMBER",
      playerId: "sari-lestari",
    },
  })

  console.log("Seed complete.")
  console.log("Admin: admin@jade.local / getsuga39")
  console.log("Member: sari@jade.local / jade123")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
