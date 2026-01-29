// GraphQL query definitions for GRID API
// File: lib/grid/queries.ts

/**
 * Fetch all tournaments for League of Legends
 * Filters by game ID and optional start date
 */
export const GET_TOURNAMENTS_QUERY = `
  query GetTournaments($gameId: String!, $startDate: Datetime) {
    allTournament(
      filter: {
        game: { id: { equalTo: $gameId } }
        startTimeScheduled: { greaterThan: $startDate }
      }
      orderBy: START_TIME_SCHEDULED_DESC
    ) {
      nodes {
        id
        title
        startTimeScheduled
        endTimeScheduled
        region
      }
      totalCount
    }
  }
`;

/**
 * Fetch all series for a specific tournament
 * Returns series metadata without game details
 */
export const GET_SERIES_FOR_TOURNAMENT_QUERY = `
  query GetSeriesForTournament($tournamentId: ID!) {
    allSeries(
      filter: {
        tournamentId: { equalTo: $tournamentId }
      }
      orderBy: START_TIME_SCHEDULED_ASC
    ) {
      nodes {
        id
        tournamentId
        startTimeScheduled
        title
      }
      totalCount
    }
  }
`;

/**
 * Fetch detailed series state including picks, bans, and player data
 * This is the primary query for extracting draft information
 */
export const GET_SERIES_STATE_QUERY = `
  query GetSeriesState($seriesId: ID!) {
    seriesState(id: $seriesId) {
      id
      started
      finished
      teams {
        id
        name
        won
        characterBans
        players {
          id
          name
          characterName
          role
          kills
          deaths
          assists
        }
      }
      games {
        id
        number
        teams {
          id
          name
          characterBans
          players {
            id
            name
            characterName
            role
          }
        }
      }
    }
  }
`;

/**
 * Fetch team roster information
 * Used to get player primary roles for role inference
 */
export const GET_TEAM_ROSTER_QUERY = `
  query GetTeamRoster($teamId: ID!) {
    team(id: $teamId) {
      id
      name
      shortName
      players {
        id
        name
        currentRole
        primaryRole
      }
    }
  }
`;

/**
 * Fetch series with team and patch information
 * Used for ETL to get patch versions
 */
export const GET_SERIES_WITH_DETAILS_QUERY = `
  query GetSeriesWithDetails($seriesId: ID!) {
    series(id: $seriesId) {
      id
      tournamentId
      title
      startTimeScheduled
      teams {
        id
        name
        shortName
      }
      games {
        id
        number
        patchVersion
        duration
        winner {
          id
        }
      }
    }
  }
`;
