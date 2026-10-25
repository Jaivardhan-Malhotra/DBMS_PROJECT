const pool = require('../config/database');

const performanceFields = [
  'runs_scored',
  'balls_faced',
  'wickets_taken',
  'is_out'
];

const getPlayerStatistics = async (req, res, next) => {
  try {
    const [players] = await pool.query(`
      SELECT
        p.player_id,
        p.player_name,
        p.role,
        p.team_id,
        t.team_name,
        t.short_name AS team_short,
        p.matches_played AS profile_matches_played,
        p.runs_scored AS profile_runs_scored,
        p.wickets_taken AS profile_wickets_taken,
        COUNT(pm.id) AS recorded_entries,
        COUNT(DISTINCT pm.match_id) AS recorded_matches,
        SUM(pm.runs_scored) AS recorded_runs,
        SUM(pm.wickets_taken) AS recorded_wickets,
        SUM(pm.balls_faced) AS balls_faced,
        SUM(pm.is_out) AS dismissals
      FROM players p
      LEFT JOIN teams t ON t.team_id = p.team_id
      LEFT JOIN player_match pm ON pm.player_id = p.player_id
      GROUP BY p.player_id, p.player_name, p.role, p.team_id, t.team_name, t.short_name,
        p.matches_played, p.runs_scored, p.wickets_taken
      ORDER BY p.player_name
    `);
    const statistics = players.map((player) => {
      const hasMatchRecords = Number(player.recorded_entries) > 0;
      const runs = Number(hasMatchRecords ? player.recorded_runs : player.profile_runs_scored) || 0;
      const wickets = Number(hasMatchRecords ? player.recorded_wickets : player.profile_wickets_taken) || 0;
      const matches = Number(hasMatchRecords ? player.recorded_matches : player.profile_matches_played) || 0;
      const ballsFaced = Number(player.balls_faced) || 0;
      const dismissals = Number(player.dismissals) || 0;

      return {
        player_id: player.player_id,
        player_name: player.player_name,
        role: player.role,
        team_id: player.team_id,
        team_name: player.team_name,
        team_short: player.team_short,
        matches_played: matches,
        runs_scored: runs,
        wickets_taken: wickets,
        batting_average: hasMatchRecords && dismissals > 0
          ? Number((runs / dismissals).toFixed(2))
          : null,
        strike_rate: hasMatchRecords && ballsFaced > 0
          ? Number((runs * 100 / ballsFaced).toFixed(2))
          : null,
        recorded_matches: Number(player.recorded_matches) || 0,
        stats_source: hasMatchRecords ? 'Match records' : 'Player profile'
      };
    });

    res.status(200).json({
      success: true,
      message: 'Player statistics retrieved successfully',
      data: statistics
    });
  } catch (error) {
    next(error);
  }
};

const getMatchRecords = async (req, res, next) => {
  try {
    const [records] = await pool.query(`
      SELECT
        pm.id,
        pm.match_id,
        pm.player_id,
        pm.team_id,
        pm.runs_scored,
        pm.balls_faced,
        pm.wickets_taken,
        pm.is_out,
        p.player_name,
        t.team_name,
        t.short_name AS team_short,
        m.match_date,
        t1.short_name AS team1_short,
        t2.short_name AS team2_short
      FROM player_match pm
      JOIN players p ON p.player_id = pm.player_id
      JOIN teams t ON t.team_id = pm.team_id
      JOIN matches m ON m.match_id = pm.match_id
      JOIN teams t1 ON t1.team_id = m.team1_id
      JOIN teams t2 ON t2.team_id = m.team2_id
      ORDER BY m.match_date DESC, pm.id DESC
    `);

    res.status(200).json({
      success: true,
      message: 'Player match records retrieved successfully',
      data: records
    });
  } catch (error) {
    next(error);
  }
};

const validateAssociations = async (matchId, playerId, teamId) => {
  const [matches] = await pool.query(`
    SELECT match_id
    FROM matches
    WHERE match_id = ? AND (team1_id = ? OR team2_id = ?)
  `, [matchId, teamId, teamId]);

  if (matches.length === 0) {
    return 'The selected team must participate in the selected match.';
  }

  const [players] = await pool.query(
    'SELECT player_id, team_id FROM players WHERE player_id = ?',
    [playerId]
  );
  if (players.length === 0) {
    return 'The selected player does not exist.';
  }

  if (Number(players[0].team_id) !== Number(teamId)) {
    return 'The selected player must be assigned to the selected team.';
  }

  return null;
};

const createMatchRecord = async (req, res, next) => {
  try {
    const { match_id, player_id, team_id } = req.body;
    const associationError = await validateAssociations(match_id, player_id, team_id);
    if (associationError) {
      return res.status(400).json({ success: false, message: associationError });
    }

    const values = performanceFields.map((field) => req.body[field] ?? 0);
    const [result] = await pool.query(`
      INSERT INTO player_match (
        match_id, player_id, team_id, ${performanceFields.join(', ')}
      ) VALUES (?, ?, ?, ${performanceFields.map(() => '?').join(', ')})
    `, [match_id, player_id, team_id, ...values]);

    const [created] = await pool.query('SELECT * FROM player_match WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: 'Player match record created successfully',
      data: created[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateMatchRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existingRows] = await pool.query('SELECT * FROM player_match WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: `Player match record ${id} not found.` });
    }

    const existing = existingRows[0];
    const matchId = req.body.match_id ?? existing.match_id;
    const playerId = req.body.player_id ?? existing.player_id;
    const teamId = req.body.team_id ?? existing.team_id;
    const associationError = await validateAssociations(matchId, playerId, teamId);
    if (associationError) {
      return res.status(400).json({ success: false, message: associationError });
    }

    const values = performanceFields.map((field) => req.body[field] ?? existing[field]);
    await pool.query(`
      UPDATE player_match
      SET match_id = ?, player_id = ?, team_id = ?,
        ${performanceFields.map((field) => `${field} = ?`).join(', ')}
      WHERE id = ?
    `, [matchId, playerId, teamId, ...values, id]);

    const [updated] = await pool.query('SELECT * FROM player_match WHERE id = ?', [id]);
    res.status(200).json({
      success: true,
      message: 'Player match record updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

const deleteMatchRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM player_match WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Player match record ${id} not found.` });
    }
    res.status(200).json({
      success: true,
      message: 'Player match record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlayerStatistics,
  getMatchRecords,
  createMatchRecord,
  updateMatchRecord,
  deleteMatchRecord
};
