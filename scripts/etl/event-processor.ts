/**
 * JSONL Event Processor for League of Legends ETL
 * Parses GRID.gg event timeline files and extracts detailed match data
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'

// ==========================================
// TYPES
// ==========================================

export interface ProcessedSeries {
  seriesId: string
  tournamentId: string
  games: ProcessedGame[]
  players: Map<string, PlayerInfo>
  teams: Map<string, TeamInfo>
}

export interface PlayerInfo {
  id: string
  name: string
  teamId?: string
}

export interface TeamInfo {
  id: string
  name: string
}

export interface ProcessedGame {
  id: string
  seriesId: string
  sequenceNumber: number
  patch: string
  blueTeamId?: string
  redTeamId?: string
  blueScore: number
  redScore: number
  winnerId?: string
  durationSeconds?: number
  playerStats: PlayerGameStats[]
  killEvents: KillEvent[]
  objectiveEvents: ObjectiveEvent[]
  itemEvents: ItemEvent[]
  wardEvents: WardEvent[]
  goldSnapshots: GoldSnapshot[]
  positionSnapshots: PositionSnapshot[]
  gameStateSnapshots: GameStateSnapshot[]
}

export interface PlayerGameStats {
  playerId: string
  teamId: string
  championName: string
  role: string
  teamSide: 'blue' | 'red'
  kills: number
  deaths: number
  assists: number
  damageDealtChampions: number
  damageDealtObjectives: number
  damageTaken: number
  healingDone: number
  shieldingDone: number
  goldEarned: number
  goldSpent: number
  csTotal: number
  csMinute: number
  wardsPlaced: number
  wardsDestroyed: number
  visionScore: number
  firstBlood: boolean
  firstBloodVictim: boolean
  soloKills: number
  multiKills: { double: number; triple: number; quadra: number; penta: number }
  finalItems: string[]
}

export interface KillEvent {
  gameTimeSeconds: number
  killerId?: string
  victimId: string
  assistingPlayerIds: string[]
  isFirstBlood: boolean
  isSoloKill: boolean
  isShutdown: boolean
  shutdownBounty: number
  positionX?: number
  positionY?: number
}

export interface ObjectiveEvent {
  gameTimeSeconds: number
  objectiveType: string // dragon_cloud, baron, tower_outer_top, etc.
  teamSide: 'blue' | 'red'
  killerPlayerId?: string
  assistingPlayerIds: string[]
  positionX?: number
  positionY?: number
}

export interface ItemEvent {
  gameTimeSeconds: number
  playerId: string
  eventType: 'purchase' | 'sell' | 'undo'
  itemName: string
  itemCost: number
}

export interface WardEvent {
  gameTimeSeconds: number
  eventType: 'placed' | 'destroyed' | 'expired'
  wardType: string // yellow_trinket, control_ward, etc.
  playerId: string
  positionX: number
  positionY: number
  destroyedByPlayerId?: string
}

export interface GoldSnapshot {
  gameTimeSeconds: number
  playerId: string
  totalGold: number
  currentGold: number
  goldPerSecond: number
}

export interface PositionSnapshot {
  gameTimeSeconds: number
  playerId: string
  positionX: number
  positionY: number
  alive: boolean
  healthPercent: number
  manaPercent: number
}

export interface GameStateSnapshot {
  gameTimeSeconds: number
  blueTotalGold: number
  redTotalGold: number
  goldDiff: number
  blueTotalXp: number
  redTotalXp: number
  xpDiff: number
  blueDragons: number
  redDragons: number
  blueBarons: number
  redBarons: number
  blueHeralds: number
  redHeralds: number
  blueTowers: number
  redTowers: number
  blueInhibitors: number
  redInhibitors: number
  blueKills: number
  redKills: number
}

// ==========================================
// EVENT PROCESSOR CLASS
// ==========================================

export class EventProcessor {
  // State tracking during processing
  private currentSeriesId: string = ''
  private currentGameId: string = ''
  private currentPatch: string = ''
  private tournamentId: string = ''

  // Team/player state
  private playerTeams: Map<string, string> = new Map()
  private playerChampions: Map<string, string> = new Map()
  private playerRoles: Map<string, string> = new Map()
  private playerSides: Map<string, 'blue' | 'red'> = new Map()
  private teamSides: Map<string, 'blue' | 'red'> = new Map()

  // Game state
  private gameKills: KillEvent[] = []
  private gameObjectives: ObjectiveEvent[] = []
  private gameItems: ItemEvent[] = []
  private gameWards: WardEvent[] = []
  private gameGoldSnapshots: GoldSnapshot[] = []
  private gamePositions: PositionSnapshot[] = []
  private gameStateSnapshots: GameStateSnapshot[] = []
  private playerKills: Map<string, number> = new Map()
  private playerDeaths: Map<string, number> = new Map()
  private playerAssists: Map<string, number> = new Map()

  // Accumulated data
  private games: ProcessedGame[] = []
  private currentGame: ProcessedGame | null = null
  private players: Map<string, PlayerInfo> = new Map()
  private teams: Map<string, TeamInfo> = new Map()

  async processFile(filePath: string, seriesId: string, tournamentId: string): Promise<ProcessedSeries> {
    this.currentSeriesId = seriesId
    this.tournamentId = tournamentId
    this.reset()

    const fileStream = createReadStream(filePath)
    const rl = createInterface({ input: fileStream, crlfDelay: Infinity })

    for await (const line of rl) {
      if (!line.trim()) continue
      try {
        const message = JSON.parse(line)
        this.processMessage(message)
      } catch (e) {
        // Skip malformed lines
      }
    }

    // Finalize last game if needed
    if (this.currentGame) {
      this.finalizeGame()
      this.games.push(this.currentGame)
    }

    return {
      seriesId,
      tournamentId,
      games: this.games,
      players: this.players,
      teams: this.teams,
    }
  }

  private reset() {
    this.games = []
    this.currentGame = null
    this.players.clear()
    this.teams.clear()
    this.resetGameState()
  }

  private resetGameState() {
    this.gameKills = []
    this.gameObjectives = []
    this.gameItems = []
    this.gameWards = []
    this.gameGoldSnapshots = []
    this.gamePositions = []
    this.gameStateSnapshots = []
    this.playerKills.clear()
    this.playerDeaths.clear()
    this.playerAssists.clear()
  }

  private processMessage(message: any) {
    const events = message.events || []
    for (const event of events) {
      this.processEvent(event, message.occurredAt)
    }
  }

  private processEvent(event: any, timestamp: string) {
    const type = event.type
    const actor = event.actor
    const target = event.target
    const seriesState = event.seriesState

    switch (type) {
      case 'tournament-started-series':
        this.handleSeriesStart(seriesState)
        break
      case 'series-started-game':
        this.handleGameStart(event, seriesState)
        break
      case 'player-killed-player':
        this.handleKill(event, actor, target)
        break
      case 'team-destroyed-structure':
      case 'team-killed-monster':
        this.handleObjective(event, actor, target)
        break
      case 'player-bought-item':
      case 'player-sold-item':
        this.handleItemEvent(event, actor)
        break
      case 'player-placed-ward':
      case 'player-destroyed-ward':
        this.handleWardEvent(event, actor, target)
        break
      case 'game-snapshot':
        this.handleSnapshot(event, seriesState)
        break
      case 'team-won-game':
        this.handleGameEnd(event, actor, seriesState)
        break
      case 'series-ended-game':
        this.handleSeriesGameEnd(event, seriesState)
        break
    }
  }

  private handleSeriesStart(seriesState: any) {
    if (!seriesState?.teams) return

    for (const team of seriesState.teams) {
      if (team.id && team.name) {
        this.teams.set(team.id, { id: team.id, name: team.name })
      }

      // Determine team side
      const side = team.side?.toLowerCase() as 'blue' | 'red'
      if (side) {
        this.teamSides.set(team.id, side)
      }

      for (const player of team.players || []) {
        if (player.id) {
          this.players.set(player.id, {
            id: player.id,
            name: player.name || player.id,
            teamId: team.id,
          })
          this.playerTeams.set(player.id, team.id)
          if (side) {
            this.playerSides.set(player.id, side)
          }
          if (player.characterName) {
            this.playerChampions.set(player.id, player.characterName)
          }
          if (player.role) {
            this.playerRoles.set(player.id, player.role)
          }
        }
      }
    }
  }

  private handleGameStart(event: any, seriesState: any) {
    // Save previous game
    if (this.currentGame) {
      this.finalizeGame()
      this.games.push(this.currentGame)
    }

    const gameState = seriesState?.games?.slice(-1)[0]
    const gameId = gameState?.id || event.target?.id || `game_${this.games.length + 1}`
    const patch = gameState?.patch || seriesState?.patch || 'unknown'

    this.currentGameId = gameId
    this.currentPatch = patch
    this.resetGameState()

    // Get team IDs
    const teamIds = Array.from(this.teams.keys())
    const blueTeam = teamIds.find(id => this.teamSides.get(id) === 'blue')
    const redTeam = teamIds.find(id => this.teamSides.get(id) === 'red')

    this.currentGame = {
      id: gameId,
      seriesId: this.currentSeriesId,
      sequenceNumber: this.games.length + 1,
      patch,
      blueTeamId: blueTeam,
      redTeamId: redTeam,
      blueScore: 0,
      redScore: 0,
      winnerId: undefined,
      playerStats: [],
      killEvents: [],
      objectiveEvents: [],
      itemEvents: [],
      wardEvents: [],
      goldSnapshots: [],
      positionSnapshots: [],
      gameStateSnapshots: [],
    }
  }

  private handleKill(event: any, actor: any, target: any) {
    const gameTime = event.gameTime?.seconds || 0
    const killerId = actor?.id
    const victimId = target?.id

    if (!victimId) return

    // Extract positions
    const killerPos = actor?.state?.position || actor?.stateDelta?.position
    const victimPos = target?.state?.position || target?.stateDelta?.position

    // Extract assisters
    const assisters: string[] = []
    const assistData = event.assistingPlayers || actor?.state?.assistingPlayers || []
    for (const assist of assistData) {
      if (assist.id || assist.playerId) {
        assisters.push(assist.id || assist.playerId)
      }
    }

    // Determine if first blood
    const isFirstBlood = this.gameKills.length === 0

    // Determine if solo kill
    const isSoloKill = assisters.length === 0 && killerId !== undefined

    // Shutdown bounty (if available)
    const shutdownBounty = event.shutdownBounty || 0
    const isShutdown = shutdownBounty > 0

    const killEvent: KillEvent = {
      gameTimeSeconds: gameTime,
      killerId,
      victimId,
      assistingPlayerIds: assisters,
      isFirstBlood,
      isSoloKill,
      isShutdown,
      shutdownBounty,
      positionX: victimPos?.x || killerPos?.x,
      positionY: victimPos?.y || killerPos?.y,
    }

    this.gameKills.push(killEvent)

    // Update player stats
    if (killerId) {
      this.playerKills.set(killerId, (this.playerKills.get(killerId) || 0) + 1)
    }
    this.playerDeaths.set(victimId, (this.playerDeaths.get(victimId) || 0) + 1)
    for (const assisterId of assisters) {
      this.playerAssists.set(assisterId, (this.playerAssists.get(assisterId) || 0) + 1)
    }
  }

  private handleObjective(event: any, actor: any, target: any) {
    const gameTime = event.gameTime?.seconds || 0
    const killerId = actor?.id
    const teamId = actor?.teamId || this.playerTeams.get(killerId)
    const teamSide = teamId ? this.teamSides.get(teamId) : undefined

    if (!teamSide) return

    // Determine objective type
    let objectiveType = ''
    if (event.type === 'team-destroyed-structure') {
      const structure = target?.state?.structure || event.structure
      objectiveType = this.mapStructureType(structure)
    } else if (event.type === 'team-killed-monster') {
      const monster = target?.state?.monster || event.monster
      objectiveType = this.mapMonsterType(monster)
    }

    if (!objectiveType) return

    const pos = target?.state?.position || target?.stateDelta?.position

    // Extract assisters
    const assisters: string[] = []
    const assistData = event.assistingPlayers || []
    for (const assist of assistData) {
      if (assist.id) assisters.push(assist.id)
    }

    this.gameObjectives.push({
      gameTimeSeconds: gameTime,
      objectiveType,
      teamSide,
      killerPlayerId: killerId,
      assistingPlayerIds: assisters,
      positionX: pos?.x,
      positionY: pos?.y,
    })
  }

  private handleItemEvent(event: any, actor: any) {
    const gameTime = event.gameTime?.seconds || 0
    const playerId = actor?.id

    if (!playerId) return

    const item = event.item || event.target?.state?.item
    const itemName = item?.name || 'unknown'
    const itemCost = item?.cost || item?.price || 0

    const eventType = event.type === 'player-bought-item' ? 'purchase' : 'sell'

    this.gameItems.push({
      gameTimeSeconds: gameTime,
      playerId,
      eventType,
      itemName,
      itemCost,
    })
  }

  private handleWardEvent(event: any, actor: any, target: any) {
    const gameTime = event.gameTime?.seconds || 0
    const playerId = actor?.id

    if (!playerId) return

    const eventType = event.type === 'player-placed-ward' ? 'placed' : 'destroyed'
    const ward = event.ward || target?.state?.ward
    const wardType = ward?.type || 'yellow_trinket'
    const pos = ward?.position || actor?.state?.position

    if (!pos?.x || !pos?.y) return

    this.gameWards.push({
      gameTimeSeconds: gameTime,
      eventType: eventType as 'placed' | 'destroyed',
      wardType,
      playerId,
      positionX: pos.x,
      positionY: pos.y,
      destroyedByPlayerId: eventType === 'destroyed' ? playerId : undefined,
    })
  }

  private handleSnapshot(event: any, seriesState: any) {
    const gameTime = event.gameTime?.seconds || 0
    const gameState = seriesState?.games?.slice(-1)[0]

    if (!gameState?.teams) return

    // Snapshot player gold and positions
    for (const team of gameState.teams) {
      for (const player of team.players || []) {
        if (!player.id) continue

        // Gold snapshot
        if (player.gold !== undefined) {
          this.gameGoldSnapshots.push({
            gameTimeSeconds: gameTime,
            playerId: player.id,
            totalGold: player.gold?.total || player.gold || 0,
            currentGold: player.gold?.current || 0,
            goldPerSecond: player.gold?.perSecond || 0,
          })
        }

        // Position snapshot
        if (player.position) {
          this.gamePositions.push({
            gameTimeSeconds: gameTime,
            playerId: player.id,
            positionX: player.position.x,
            positionY: player.position.y,
            alive: player.alive !== false,
            healthPercent: player.health?.percent || 100,
            manaPercent: player.mana?.percent || 100,
          })
        }
      }
    }

    // Game state snapshot
    const blueTeam = gameState.teams.find((t: any) => this.teamSides.get(t.id) === 'blue')
    const redTeam = gameState.teams.find((t: any) => this.teamSides.get(t.id) === 'red')

    if (blueTeam && redTeam) {
      this.gameStateSnapshots.push({
        gameTimeSeconds: gameTime,
        blueTotalGold: blueTeam.gold?.total || 0,
        redTotalGold: redTeam.gold?.total || 0,
        goldDiff: (blueTeam.gold?.total || 0) - (redTeam.gold?.total || 0),
        blueTotalXp: blueTeam.experience?.total || 0,
        redTotalXp: redTeam.experience?.total || 0,
        xpDiff: (blueTeam.experience?.total || 0) - (redTeam.experience?.total || 0),
        blueDragons: blueTeam.objectives?.dragons || 0,
        redDragons: redTeam.objectives?.dragons || 0,
        blueBarons: blueTeam.objectives?.barons || 0,
        redBarons: redTeam.objectives?.barons || 0,
        blueHeralds: blueTeam.objectives?.heralds || 0,
        redHeralds: redTeam.objectives?.heralds || 0,
        blueTowers: blueTeam.objectives?.towers || 0,
        redTowers: redTeam.objectives?.towers || 0,
        blueInhibitors: blueTeam.objectives?.inhibitors || 0,
        redInhibitors: redTeam.objectives?.inhibitors || 0,
        blueKills: blueTeam.kills || 0,
        redKills: redTeam.kills || 0,
      })
    }
  }

  private handleGameEnd(event: any, actor: any, seriesState: any) {
    if (this.currentGame) {
      this.currentGame.winnerId = actor?.id

      // Update scores
      const winnerSide = this.teamSides.get(actor?.id)
      if (winnerSide === 'blue') {
        this.currentGame.blueScore = 1
        this.currentGame.redScore = 0
      } else if (winnerSide === 'red') {
        this.currentGame.blueScore = 0
        this.currentGame.redScore = 1
      }

      // Get game duration
      const gameState = seriesState?.games?.slice(-1)[0]
      this.currentGame.durationSeconds = gameState?.duration?.seconds || event.gameTime?.seconds
    }
  }

  private handleSeriesGameEnd(event: any, seriesState: any) {
    // Game already handled in handleGameEnd
  }

  private finalizeGame() {
    if (!this.currentGame) return

    // Build player stats
    const playerStats: PlayerGameStats[] = []

    for (const [playerId, player] of this.players) {
      const teamId = this.playerTeams.get(playerId) || ''
      const championName = this.playerChampions.get(playerId) || 'unknown'
      const role = this.playerRoles.get(playerId) || 'unknown'
      const teamSide = this.playerSides.get(playerId) || 'blue'

      const kills = this.playerKills.get(playerId) || 0
      const deaths = this.playerDeaths.get(playerId) || 0
      const assists = this.playerAssists.get(playerId) || 0

      // Check first blood
      const firstBlood = this.gameKills.length > 0 && this.gameKills[0].killerId === playerId
      const firstBloodVictim = this.gameKills.length > 0 && this.gameKills[0].victimId === playerId

      // Count solo kills
      const soloKills = this.gameKills.filter(
        k => k.killerId === playerId && k.isSoloKill
      ).length

      // Multi-kills (simplified - would need more context)
      const multiKills = { double: 0, triple: 0, quadra: 0, penta: 0 }

      playerStats.push({
        playerId,
        teamId,
        championName,
        role,
        teamSide,
        kills,
        deaths,
        assists,
        damageDealtChampions: 0, // Would need from snapshot
        damageDealtObjectives: 0,
        damageTaken: 0,
        healingDone: 0,
        shieldingDone: 0,
        goldEarned: 0, // Would calculate from snapshots
        goldSpent: 0,
        csTotal: 0,
        csMinute: 0,
        wardsPlaced: this.gameWards.filter(w => w.playerId === playerId && w.eventType === 'placed').length,
        wardsDestroyed: this.gameWards.filter(w => w.playerId === playerId && w.eventType === 'destroyed').length,
        visionScore: 0,
        firstBlood,
        firstBloodVictim,
        soloKills,
        multiKills,
        finalItems: [],
      })
    }

    this.currentGame.playerStats = playerStats
    this.currentGame.killEvents = this.gameKills
    this.currentGame.objectiveEvents = this.gameObjectives
    this.currentGame.itemEvents = this.gameItems
    this.currentGame.wardEvents = this.gameWards
    this.currentGame.goldSnapshots = this.gameGoldSnapshots
    this.currentGame.positionSnapshots = this.gamePositions
    this.currentGame.gameStateSnapshots = this.gameStateSnapshots
  }

  private mapStructureType(structure: any): string {
    const type = structure?.type?.toLowerCase() || structure?.toLowerCase() || ''
    const lane = structure?.lane?.toLowerCase() || ''
    const tier = structure?.tier || ''

    if (type.includes('tower')) {
      return `tower_${tier}_${lane}` // e.g., tower_outer_top
    } else if (type.includes('inhibitor')) {
      return `inhibitor_${lane}` // e.g., inhibitor_mid
    } else if (type.includes('nexus')) {
      return 'nexus'
    }
    return type
  }

  private mapMonsterType(monster: any): string {
    const type = monster?.type?.toLowerCase() || monster?.toLowerCase() || ''
    const subtype = monster?.subtype?.toLowerCase() || ''

    if (type.includes('dragon')) {
      if (subtype) return `dragon_${subtype}` // e.g., dragon_cloud
      return 'dragon'
    } else if (type.includes('baron')) {
      return 'baron'
    } else if (type.includes('herald') || type.includes('rift')) {
      return 'herald'
    }
    return type
  }
}
