const pool = require('../config/database');

const matchDetailsQuery = `
  SELECT
    v.match_id,
    v.match_date,
    v.match_time,
    v.status,
    v.season_year,
    v.venue_name,
    v.venue_city,
    v.team1_name,
    v.team1_short,
    v.team2_name,
    v.team2_short,
    m.season_id,
    m.venue_id,
    m.team1_id,
    m.team2_id
  FROM v_match_details v
  JOIN matches m ON v.match_id = m.match_id
`;

/**
 * Controller for Matches operations
 */

// GET /api/matches - Retrieve all scheduled matches with optional filters
const getAllMatches = async (req, res, next) => {
  try {
    const { season_id, team_id, status, venue_id } = req.query;

    let dataQuery = `
      SELECT 
        v.match_id,
        v.match_date,
        v.match_time,
        v.status,
        v.season_year,
        v.venue_name,
        v.venue_city,
        v.team1_name,
        v.team1_short,
        v.team2_name,
        v.team2_short,
        m.season_id,
        m.venue_id,
        m.team1_id,
        m.team2_id
      FROM v_match_details v
      JOIN matches m ON v.match_id = m.match_id
      WHERE 1=1
    `;

    const queryParams = [];

    if (season_id) {
      dataQuery += ' AND m.season_id = ?';
      queryParams.push(season_id);
    }

    if (team_id) {
      dataQuery += ' AND (m.team1_id = ? OR m.team2_id = ?)';
      queryParams.push(team_id, team_id);
    }

    if (status) {
      dataQuery += ' AND m.status = ?';
      queryParams.push(status);
    }

    if (venue_id) {
      dataQuery += ' AND m.venue_id = ?';
      queryParams.push(venue_id);
    }

    dataQuery += ' ORDER BY m.match_date DESC, m.match_id DESC';

    const [matches] = await pool.query(dataQuery, queryParams);

    res.status(200).json({
      success: true,
      message: 'Matches retrieved successfully',
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/:id - Retrieve single match using v_match_details
const getMatchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `${matchDetailsQuery} WHERE v.match_id = ?`;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Match with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Match details retrieved successfully',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/matches - Create a new match with validations
const createMatch = async (req, res, next) => {
  try {
    const {
      season_id,
      venue_id,
      team1_id,
      team2_id,
      match_date,
      match_time = null,
      status = 'Scheduled'
    } = req.body;

    if (!season_id || !venue_id || !team1_id || !team2_id || !match_date) {
      return res.status(400).json({
        success: false,
        message: 'season_id, venue_id, team1_id, team2_id, and match_date are required'
      });
    }

    if (Number(team1_id) === Number(team2_id)) {
      return res.status(400).json({
        success: false,
        message: 'team1_id and team2_id must be different teams'
      });
    }

    // Verify season exists
    const [seasonRows] = await pool.query('SELECT season_id FROM seasons WHERE season_id = ?', [season_id]);
    if (seasonRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Season with ID ${season_id} does not exist`
      });
    }

    // Verify venue exists
    const [venueRows] = await pool.query('SELECT venue_id FROM venues WHERE venue_id = ?', [venue_id]);
    if (venueRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Venue with ID ${venue_id} does not exist`
      });
    }

    // Verify teams exist
    const [team1Rows] = await pool.query('SELECT team_id FROM teams WHERE team_id = ?', [team1_id]);
    const [team2Rows] = await pool.query('SELECT team_id FROM teams WHERE team_id = ?', [team2_id]);
    if (team1Rows.length === 0 || team2Rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'One or both specified teams do not exist'
      });
    }

    const insertQuery = `
      INSERT INTO matches (
        season_id, venue_id, team1_id, team2_id, match_date, match_time, match_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      season_id,
      venue_id,
      team1_id,
      team2_id,
      match_date,
      match_time || null,
      'League',
      status || 'Scheduled'
    ]);

    const [created] = await pool.query(`${matchDetailsQuery} WHERE v.match_id = ?`, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: created[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/matches/:id - Update an existing match
const updateMatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      season_id,
      venue_id,
      team1_id,
      team2_id,
      match_date,
      match_time,
      status
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM matches WHERE match_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Match with ID ${id} not found`
      });
    }

    const current = existing[0];
    const finalTeam1 = team1_id !== undefined ? team1_id : current.team1_id;
    const finalTeam2 = team2_id !== undefined ? team2_id : current.team2_id;

    if (Number(finalTeam1) === Number(finalTeam2)) {
      return res.status(400).json({
        success: false,
        message: 'team1_id and team2_id cannot be the same team'
      });
    }

    const [unmatchedRecords] = await pool.query(`
      SELECT id
      FROM player_match
      WHERE match_id = ? AND team_id NOT IN (?, ?)
      LIMIT 1
    `, [id, finalTeam1, finalTeam2]);
    if (unmatchedRecords.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot change participating teams while player performance records reference a different team.'
      });
    }

    const updateQuery = `
      UPDATE matches SET
        season_id = ?,
        venue_id = ?,
        team1_id = ?,
        team2_id = ?,
        match_date = ?,
        match_time = ?,
        status = ?
      WHERE match_id = ?
    `;

    await pool.query(updateQuery, [
      season_id !== undefined ? season_id : current.season_id,
      venue_id !== undefined ? venue_id : current.venue_id,
      finalTeam1,
      finalTeam2,
      match_date !== undefined ? match_date : current.match_date,
      match_time !== undefined ? match_time : current.match_time,
      status !== undefined ? status : current.status,
      id
    ]);

    const [updated] = await pool.query(`${matchDetailsQuery} WHERE v.match_id = ?`, [id]);

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/matches/:id - Delete a match
const deleteMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM matches WHERE match_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Match with ID ${id} not found`
      });
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      await connection.query('DELETE FROM player_match WHERE match_id = ?', [id]);
      await connection.query('DELETE FROM matches WHERE match_id = ?', [id]);
      await connection.commit();
      transactionStarted = false;
    } catch (dbError) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw dbError;
    } finally {
      connection.release();
    }

    res.status(200).json({
      success: true,
      message: `Match #${id} deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/:id/innings - Get innings for a match with team names
const getMatchInnings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [match] = await pool.query('SELECT match_id FROM matches WHERE match_id = ?', [id]);
    if (match.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Match with ID ${id} not found`
      });
    }

    const query = `
      SELECT 
        i.innings_id,
        i.match_id,
        i.innings_no,
        i.batting_team_id,
        bt.team_name AS batting_team_name,
        bt.short_name AS batting_team_short,
        i.bowling_team_id,
        bw.team_name AS bowling_team_name,
        bw.short_name AS bowling_team_short,
        i.total_runs,
        i.total_wickets,
        i.total_overs,
        i.extras,
        i.is_completed,
        i.created_at
      FROM innings i
      JOIN teams bt ON i.batting_team_id = bt.team_id
      JOIN teams bw ON i.bowling_team_id = bw.team_id
      WHERE i.match_id = ?
      ORDER BY i.innings_no ASC
    `;

    const [innings] = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      message: `Innings for match #${id} fetched successfully`,
      data: innings
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/matches/:id/umpires - Get umpires officiating a match
const getMatchUmpires = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [match] = await pool.query('SELECT match_id FROM matches WHERE match_id = ?', [id]);
    if (match.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Match with ID ${id} not found`
      });
    }

    const query = `
      SELECT 
        mu.match_id,
        mu.role,
        u.umpire_id,
        u.umpire_name,
        u.nationality,
        u.umpire_type,
        u.experience_years,
        u.matches_officiated
      FROM match_umpires mu
      JOIN umpires u ON mu.umpire_id = u.umpire_id
      WHERE mu.match_id = ?
      ORDER BY mu.role ASC
    `;

    const [umpires] = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      message: `Umpires for match #${id} fetched successfully`,
      data: umpires
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchInnings,
  getMatchUmpires
};
