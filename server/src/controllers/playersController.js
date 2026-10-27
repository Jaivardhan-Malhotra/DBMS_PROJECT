const pool = require('../config/database');

const VALID_ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const VALID_BATTING_STYLES = ['Right-Hand', 'Left-Hand'];
const toDatabaseBoolean = (value) => (
  value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
);

/**
 * Controller for Players operations
 */

// GET /api/players - List players with team details, filters, search, and pagination
const getAllPlayers = async (req, res, next) => {
  try {
    const { team_id, role, search, is_active } = req.query;

    let dataQuery = `
      SELECT 
        p.player_id,
        p.player_name,
        p.dob,
        p.nationality,
        p.role,
        p.batting_style,
        p.bowling_style,
        p.jersey_no,
        p.is_active,
        p.team_id,
        t.team_name,
        t.short_name AS team_short,
        t.jersey_color AS team_color
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE 1=1
    `;

    const queryParams = [];

    if (team_id) {
      dataQuery += ' AND p.team_id = ?';
      queryParams.push(team_id);
    }

    if (role) {
      dataQuery += ' AND p.role = ?';
      queryParams.push(role);
    }

    if (is_active !== undefined) {
      const activeVal = is_active === 'true' || is_active === '1' ? 1 : 0;
      dataQuery += ' AND p.is_active = ?';
      queryParams.push(activeVal);
    }

    if (search) {
      const searchPattern = `%${search.trim()}%`;
      dataQuery += ' AND (p.player_name LIKE ? OR p.nationality LIKE ?)';
      queryParams.push(searchPattern, searchPattern);
    }

    dataQuery += ' ORDER BY p.player_name ASC';

    const [players] = await pool.query(dataQuery, queryParams);

    res.status(200).json({
      success: true,
      message: 'Players retrieved successfully',
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/players/:id - Get a player with their associated team
const getPlayerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [players] = await pool.query(`
      SELECT 
        p.player_id,
        p.player_name,
        p.dob,
        p.nationality,
        p.role,
        p.batting_style,
        p.bowling_style,
        p.jersey_no,
        p.is_active,
        p.team_id,
        t.team_name,
        t.short_name AS team_short,
        t.city AS team_city
      FROM players p
      LEFT JOIN teams t ON p.team_id = t.team_id
      WHERE p.player_id = ?
    `, [id]);

    if (players.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Player with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Player retrieved successfully',
      data: players[0]
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/players - Create new player
const createPlayer = async (req, res, next) => {
  try {
    const {
      player_name,
      dob = null,
      nationality = 'Indian',
      role,
      batting_style = 'Right-Hand',
      bowling_style = null,
      team_id = null,
      jersey_no = null,
      is_active = 1
    } = req.body;

    if (!player_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'player_name and role are required fields'
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    if (batting_style && !VALID_BATTING_STYLES.includes(batting_style)) {
      return res.status(400).json({
        success: false,
        message: `Invalid batting_style '${batting_style}'. Must be one of: ${VALID_BATTING_STYLES.join(', ')}`
      });
    }

    if (team_id !== null) {
      const [teams] = await pool.query('SELECT team_id FROM teams WHERE team_id = ?', [team_id]);
      if (teams.length === 0) {
        return res.status(400).json({ success: false, message: 'The selected team does not exist.' });
      }
    }

    const insertQuery = `
      INSERT INTO players (
        player_name, dob, nationality, role, batting_style, bowling_style,
        team_id, jersey_no, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(insertQuery, [
      player_name.trim(),
      dob || null,
      nationality ? nationality.trim() : 'Indian',
      role,
      batting_style || 'Right-Hand',
      bowling_style ? bowling_style.trim() : null,
      team_id || null,
      jersey_no ?? null,
      is_active !== undefined ? toDatabaseBoolean(is_active) : 1
    ]);

    const [createdRows] = await pool.query(`
      SELECT p.player_id, p.player_name, p.dob, p.nationality, p.role,
        p.batting_style, p.bowling_style, p.team_id, p.jersey_no, p.is_active,
        t.team_name, t.short_name AS team_short 
      FROM players p 
      LEFT JOIN teams t ON p.team_id = t.team_id 
      WHERE p.player_id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Player created successfully',
      data: createdRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/players/:id - Update an existing player
const updatePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      player_name,
      dob,
      nationality,
      role,
      batting_style,
      bowling_style,
      team_id,
      jersey_no,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM players WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Player with ID ${id} not found`
      });
    }

    const current = existing[0];
    const finalTeamId = team_id !== undefined ? team_id : current.team_id;

    if (finalTeamId !== null) {
      const [teams] = await pool.query('SELECT team_id FROM teams WHERE team_id = ?', [finalTeamId]);
      if (teams.length === 0) {
        return res.status(400).json({ success: false, message: 'The selected team does not exist.' });
      }
    }

    if (Number(finalTeamId || 0) !== Number(current.team_id || 0)) {
      const [captainTeams] = await pool.query(
        'SELECT team_id FROM teams WHERE captain_id = ?',
        [id]
      );
      if (captainTeams.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Clear or reassign this player as team captain before changing their team.'
        });
      }
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${role}'. Role must be one of: ${VALID_ROLES.join(', ')}`
      });
    }

    if (batting_style && !VALID_BATTING_STYLES.includes(batting_style)) {
      return res.status(400).json({
        success: false,
        message: `Invalid batting_style '${batting_style}'. Must be one of: ${VALID_BATTING_STYLES.join(', ')}`
      });
    }

    const updateQuery = `
      UPDATE players SET
        player_name = ?,
        dob = ?,
        nationality = ?,
        role = ?,
        batting_style = ?,
        bowling_style = ?,
        team_id = ?,
        jersey_no = ?,
        is_active = ?
      WHERE player_id = ?
    `;

    await pool.query(updateQuery, [
      player_name !== undefined ? player_name.trim() : current.player_name,
      dob !== undefined ? dob : current.dob,
      nationality !== undefined ? nationality.trim() : current.nationality,
      role !== undefined ? role : current.role,
      batting_style !== undefined ? batting_style : current.batting_style,
      bowling_style !== undefined ? (bowling_style ? bowling_style.trim() : null) : current.bowling_style,
      finalTeamId,
      jersey_no !== undefined ? jersey_no : current.jersey_no,
      is_active !== undefined ? toDatabaseBoolean(is_active) : current.is_active,
      id
    ]);

    const [updatedRows] = await pool.query(`
      SELECT p.player_id, p.player_name, p.dob, p.nationality, p.role,
        p.batting_style, p.bowling_style, p.team_id, p.jersey_no, p.is_active,
        t.team_name, t.short_name AS team_short 
      FROM players p 
      LEFT JOIN teams t ON p.team_id = t.team_id 
      WHERE p.player_id = ?
    `, [id]);

    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: updatedRows[0]
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/players/:id - Delete a player
const deletePlayer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query('SELECT * FROM players WHERE player_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Player with ID ${id} not found`
      });
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;
      await connection.query('UPDATE matches SET player_of_match = NULL WHERE player_of_match = ?', [id]);
      await connection.query('DELETE FROM player_match WHERE player_id = ?', [id]);
      await connection.query('DELETE FROM players WHERE player_id = ?', [id]);
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
      message: `Player '${existing[0].player_name}' deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  deletePlayer
};
