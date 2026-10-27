const pool = require('../config/database');

const getTeamStatistics = async (req, res, next) => {
  try {
    const requestedSeasonId = req.query.season_id;
    if (
      requestedSeasonId !== undefined
      && (!/^\d+$/.test(String(requestedSeasonId)) || Number(requestedSeasonId) < 1)
    ) {
      return res.status(400).json({
        success: false,
        message: 'season_id must be a positive integer.'
      });
    }

    const seasonQuery = requestedSeasonId
      ? 'SELECT season_id, season_year FROM seasons WHERE season_id = ?'
      : `SELECT season_id, season_year
         FROM seasons
         WHERE season_year = (SELECT MAX(season_year) FROM seasons)`;
    const seasonParams = requestedSeasonId ? [Number(requestedSeasonId)] : [];
    const [seasons] = await pool.query(seasonQuery, seasonParams);

    if (seasons.length === 0) {
      return res.status(requestedSeasonId ? 404 : 200).json({
        success: !requestedSeasonId,
        message: requestedSeasonId ? 'Season not found.' : 'No seasons are available.',
        data: []
      });
    }

    const seasonId = seasons[0].season_id;
    const [teams] = await pool.query(`
      SELECT
        t.team_id,
        t.team_name,
        t.short_name,
        t.city,
        t.jersey_color,
        t.titles_won,
        (SELECT COUNT(*)
         FROM matches m
         WHERE (m.team1_id = t.team_id OR m.team2_id = t.team_id)
           AND m.season_id = ?
           AND m.status IN ('Completed', 'No Result')) AS total_matches_played,
        (SELECT COUNT(*)
         FROM matches m
         WHERE m.winner_id = t.team_id
           AND m.season_id = ?
           AND m.status = 'Completed') AS matches_won,
        (SELECT COUNT(*)
         FROM matches m
         WHERE (m.team1_id = t.team_id OR m.team2_id = t.team_id)
           AND m.season_id = ?
           AND m.status = 'Completed'
           AND m.winner_id IS NOT NULL
           AND m.winner_id <> t.team_id) AS matches_lost,
        (SELECT COUNT(*)
         FROM matches m
         WHERE (m.team1_id = t.team_id OR m.team2_id = t.team_id)
           AND m.season_id = ?
           AND m.status = 'No Result') AS no_results
      FROM teams t
      ORDER BY t.team_name
    `, [seasonId, seasonId, seasonId, seasonId]);

    const standings = teams.map((team) => {
      const wins = Number(team.matches_won);
      const losses = Number(team.matches_lost);
      const decidedMatches = wins + losses;

      return {
        ...team,
        season_id: seasonId,
        season_year: seasons[0].season_year,
        total_matches_played: Number(team.total_matches_played),
        matches_won: wins,
        matches_lost: losses,
        no_results: Number(team.no_results),
        win_percentage: decidedMatches > 0
          ? Number((wins * 100 / decidedMatches).toFixed(2))
          : null,
        points: wins * 2 + Number(team.no_results)
      };
    }).sort((first, second) => (
      second.points - first.points
      || second.matches_won - first.matches_won
      || (second.win_percentage || 0) - (first.win_percentage || 0)
      || first.team_name.localeCompare(second.team_name)
    )).map((team, index) => ({
      ...team,
      standings_position: index + 1
    }));

    res.status(200).json({
      success: true,
      message: 'Team statistics retrieved successfully',
      data: standings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTeamStatistics };
