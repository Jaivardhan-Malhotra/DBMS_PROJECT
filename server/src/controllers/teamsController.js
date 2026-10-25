const pool = require('../config/database');

/**
 * Controller for Teams operations
 */

// GET /api/teams - List teams with their home venues
const getAllTeams = async (req, res, next) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let dataQuery = `
      SELECT 
        t.team_id,
        t.team_name,
        t.short_name,
        t.city,
        t.coach,
        t.jersey_color,
        t.founded_year,
        t.home_venue_id,
        v.venue_name AS home_venue_name,
        v.city AS home_venue_city
      FROM teams t
      LEFT JOIN venues v ON t.home_venue_id = v.venue_id
    `;

    const queryParams = [];
    if (search) {
      const searchClause = ' WHERE (t.team_name LIKE ? OR t.short_name LIKE ? OR t.city LIKE ?)';
      dataQuery += searchClause;
      queryParams.push(search, search, search);
    }

    dataQuery += ' ORDER BY t.team_name ASC';

    const [teams] = await pool.query(dataQuery, queryParams);

    res.status(200).json({
      success: true,
      message: 'Teams fetched successfully',
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/:id - Get a team and its home venue
const getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        t.team_id,
        t.team_name,
        t.short_name,
        t.city,
        t.coach,
        t.jersey_color,
        t.founded_year,
        t.home_venue_id,
        v.venue_name AS home_venue_name,
        v.city AS home_venue_city
      FROM teams t
      LEFT JOIN venues v ON t.home_venue_id = v.venue_id
      WHERE t.team_id = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Team details retrieved successfully',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/teams - Create a new team
const createTeam = async (req, res, next) => {
  try {
    const {
      team_name,
      short_name,
      city,
      home_venue_id = null,
      coach = null,
      jersey_color = null,
      founded_year = null
    } = req.body;

    if (!team_name || !short_name || !city) {
      return res.status(400).json({
        success: false,
        message: 'team_name, short_name, and city are required fields'
      });
    }

    const insertQuery = `
      INSERT INTO teams (
        team_name, short_name, city, home_venue_id, coach, 
        jersey_color, founded_year, titles_won
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      team_name.trim(),
      short_name.trim().toUpperCase(),
      city.trim(),
      home_venue_id || null,
      coach ? coach.trim() : null,
      jersey_color ? jersey_color.trim() : null,
      founded_year || null,
      0
    ]);

    const [createdRows] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: createdRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/teams/:id - Update an existing team
const updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      team_name,
      short_name,
      city,
      home_venue_id,
      coach,
      jersey_color,
      founded_year
    } = req.body;

    // Check if team exists
    const [existing] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} not found`
      });
    }

    const current = existing[0];

    const updateQuery = `
      UPDATE teams SET
        team_name = ?,
        short_name = ?,
        city = ?,
        home_venue_id = ?,
        coach = ?,
        jersey_color = ?,
        founded_year = ?
      WHERE team_id = ?
    `;

    await pool.query(updateQuery, [
      team_name !== undefined ? team_name.trim() : current.team_name,
      short_name !== undefined ? short_name.trim().toUpperCase() : current.short_name,
      city !== undefined ? city.trim() : current.city,
      home_venue_id !== undefined ? home_venue_id : current.home_venue_id,
      coach !== undefined ? (coach ? coach.trim() : null) : current.coach,
      jersey_color !== undefined ? (jersey_color ? jersey_color.trim() : null) : current.jersey_color,
      founded_year !== undefined ? founded_year : current.founded_year,
      id
    ]);

    const [updatedRows] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/teams/:id - Delete team with graceful FK error handling
const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM teams WHERE team_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} not found`
      });
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      await connection.query('UPDATE players SET team_id = NULL WHERE team_id = ?', [id]);
      await connection.query('DELETE FROM teams WHERE team_id = ?', [id]);
      await connection.commit();
      transactionStarted = false;
    } catch (dbError) {
      if (transactionStarted) {
        await connection.rollback();
      }
      if (dbError.code === 'ER_ROW_IS_REFERENCED_2' || dbError.errno === 1451) {
        return res.status(409).json({
          success: false,
          message: 'Cannot delete team: The team is linked to matches or player performance records. Remove or reassign those associations first.'
        });
      }
      throw dbError;
    } finally {
      connection.release();
    }

    res.status(200).json({
      success: true,
      message: `Team '${existing[0].team_name}' deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/teams/:id/players - Get all players associated with a team
const getTeamPlayers = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [team] = await pool.query('SELECT team_id, team_name FROM teams WHERE team_id = ?', [id]);
    if (team.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Team with ID ${id} not found`
      });
    }

    const query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.dob,
        p.nationality,
        p.role,
        p.batting_style,
        p.bowling_style,
        p.jersey_no,
        p.is_active
      FROM players p
      WHERE p.team_id = ?
      ORDER BY p.role ASC, p.player_name ASC
    `;

    const [players] = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      message: `Players for team '${team[0].team_name}' fetched successfully`,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamPlayers
};
