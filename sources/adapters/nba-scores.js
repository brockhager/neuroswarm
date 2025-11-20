// NBA Scores Adapter - Real-time NBA game scores and status
// Uses ESPN's public API for live game data

const ORIGIN = 'espn-api';

/**
 * Query NBA scores for a specific team or all games
 * @param {Object} params - Query parameters
 * @param {string} params.team - Team name to filter (optional)
 * @param {string} params.date - Date in YYYYMMDD format (optional, defaults to today)
 * @returns {Object} Normalized adapter response
 */
export async function query(params) {
    try {
        const { team, date } = params || {};

        // ESPN API endpoint for NBA scoreboard
        let url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';
        if (date) {
            url += `?dates=${date}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`espn-http-${res.status}`);

        const data = await res.json();

        // If team specified, find that team's game
        if (team) {
            const game = data.events?.find(e =>
                e.competitions[0].competitors.some(c =>
                    c.team.displayName.toLowerCase().includes(team.toLowerCase()) ||
                    c.team.abbreviation.toLowerCase() === team.toLowerCase()
                )
            );

            if (game) {
                const competition = game.competitions[0];
                const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

                return {
                    source: 'ESPN',
                    value: {
                        gameId: game.id,
                        home: homeTeam.team.displayName,
                        homeAbbr: homeTeam.team.abbreviation,
                        homeScore: homeTeam.score,
                        away: awayTeam.team.displayName,
                        awayAbbr: awayTeam.team.abbreviation,
                        awayScore: awayTeam.score,
                        status: game.status.type.description,
                        state: game.status.type.state, // pre, in, post
                        clock: game.status.displayClock,
                        period: game.status.period,
                        venue: competition.venue?.fullName,
                        broadcast: competition.broadcasts?.[0]?.names?.[0]
                    },
                    verifiedAt: new Date().toISOString(),
                    origin: ORIGIN,
                    raw: game
                };
            } else {
                return {
                    source: 'ESPN',
                    value: null,
                    verifiedAt: new Date().toISOString(),
                    origin: ORIGIN,
                    raw: { error: 'Team not found or no game today', team }
                };
            }
        }

        // No team specified - return all games
        const games = data.events?.map(game => {
            const competition = game.competitions[0];
            const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
            const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

            return {
                gameId: game.id,
                home: homeTeam.team.displayName,
                homeAbbr: homeTeam.team.abbreviation,
                homeScore: homeTeam.score,
                away: awayTeam.team.displayName,
                awayAbbr: awayTeam.team.abbreviation,
                awayScore: awayTeam.score,
                status: game.status.type.description,
                state: game.status.type.state,
                clock: game.status.displayClock,
                period: game.status.period
            };
        }) || [];

        return {
            source: 'ESPN',
            value: {
                date: date || 'today',
                gamesCount: games.length,
                games: games
            },
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: data
        };

    } catch (e) {
        return {
            source: 'NBAScores',
            value: null,
            verifiedAt: new Date().toISOString(),
            origin: ORIGIN,
            raw: { error: e.message }
        };
    }
}

/**
 * Check if ESPN API is reachable
 * @returns {Object} Status object
 */
export async function status() {
    try {
        const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
        return {
            ok: res.ok,
            message: res.ok ? 'ESPN NBA API reachable' : `http ${res.status}`
        };
    } catch (e) {
        return { ok: false, message: e.message };
    }
}
