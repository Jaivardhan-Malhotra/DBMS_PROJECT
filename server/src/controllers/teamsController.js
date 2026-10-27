const pool = require('../config/database');
const quoteIdentifier = (identifier) => `\`${identifier.replace(/`/g, '``')}\``;

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
        t.captain_id,
        captain.player_name AS captain_name,
        t.jersey_color,
        t.founded_year,
        t.titles_won,
        t.home_venue_id,
        v.venue_name AS home_venue_name,
        v.city AS home_venue_city
      FROM teams t
      LEFT JOIN venues v ON t.home_venue_id = v.venue_id
      LEFT JOIN players captain ON captain.player_id = t.captain_id
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
        t.captain_id,
        captain.player_name AS captain_name,
        t.jersey_color,
        t.founded_year,
        t.titles_won,
        t.home_venue_id,
        v.venue_name AS home_venue_name,
        v.city AS home_venue_city
      FROM teams t
      LEFT JOIN venues v ON t.home_venue_id = v.venue_id
      LEFT JOIN players captain ON captain.player_id = t.captain_id
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
      founded_year = null,
      titles_won = 0
    } = req.body;

    if (!team_name || !short_name || !city) {
      return res.status(400).json({
        success: false,
        message: 'team_name, short_name, and city are required fields'
      });
    }

    if (home_venue_id !== null) {
      const [venues] = await pool.query('SELECT venue_id FROM venues WHERE venue_id = ?', [home_venue_id]);
      if (venues.length === 0) {
        return res.status(400).json({ success: false, message: 'The selected home venue does not exist.' });
      }
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
      titles_won
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
      founded_year,
      titles_won,
      captain_id
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
    const finalVenueId = home_venue_id !== undefined ? home_venue_id : current.home_venue_id;
    if (finalVenueId !== null && finalVenueId !== undefined) {
      const [venues] = await pool.query('SELECT venue_id FROM venues WHERE venue_id = ?', [finalVenueId]);
      if (venues.length === 0) {
        return res.status(400).json({ success: false, message: 'The selected home venue does not exist.' });
      }
    }

    const finalCaptainId = captain_id !== undefined ? captain_id : current.captain_id;
    if (finalCaptainId !== null && finalCaptainId !== undefined) {
      const [captains] = await pool.query(
        'SELECT player_id, team_id FROM players WHERE player_id = ?',
        [finalCaptainId]
      );
      if (captains.length === 0 || Number(captains[0].team_id) !== Number(id)) {
        return res.status(400).json({
          success: false,
          message: 'The captain must be a player currently assigned to this team.'
        });
      }
    }

    const updateQuery = `
      UPDATE teams SET
        team_name = ?,
        short_name = ?,
        city = ?,
        home_venue_id = ?,
        coach = ?,
        jersey_color = ?,
        founded_year = ?,
        titles_won = ?,
        captain_id = ?
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
      titles_won !== undefined ? titles_won : current.titles_won,
      finalCaptainId,
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

// DELETE /api/teams/:id - Delete team and its linked match history atomically
const deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    let transactionStarted = false;
    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [existing] = await connection.query(
        'SELECT team_id, team_name FROM teams WHERE team_id = ? FOR UPDATE',
        [id]
      );
      if (existing.length === 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(404).json({
          success: false,
          message: `Team with ID ${id} not found`
        });
      }

      const [matches] = await connection.query(`
        SELECT match_id
        FROM matches
        WHERE team1_id = ? OR team2_id = ? OR winner_id = ? OR toss_winner_id = ?
        FOR UPDATE
      `, [id, id, id, id]);
      const matchIds = matches.map(({ match_id }) => match_id);
      let deletedRelatedRecords = 0;

      if (matchIds.length > 0) {
        const [matchReferences] = await connection.query(`
          SELECT DISTINCT table_name AS child_table, column_name AS child_column
          FROM information_schema.key_column_usage
          WHERE constraint_schema = DATABASE()
            AND referenced_table_name = 'matches'
            AND table_name <> 'matches'
        `);

        for (const { child_table: table, child_column: column } of matchReferences) {
          const [result] = await connection.query(
            `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IN (?)`,
            [matchIds]
          );
          deletedRelatedRecords += result.affectedRows;
        }
      }

      if (matchIds.length > 0) {
        await connection.query('DELETE FROM matches WHERE match_id IN (?)', [matchIds]);
      }

      const [teamReferences] = await connection.query(`
        SELECT DISTINCT
          k.table_name AS child_table,
          k.column_name AS child_column,
          c.is_nullable AS nullable
        FROM information_schema.key_column_usage k
        JOIN information_schema.columns c
          ON c.table_schema = k.table_schema
          AND c.table_name = k.table_name
          AND c.column_name = k.column_name
        WHERE k.constraint_schema = DATABASE()
          AND k.referenced_table_name = 'teams'
          AND k.table_name NOT IN ('teams', 'matches')
      `);

      for (const { child_table: table, child_column: column, nullable } of teamReferences) {
        const statement = nullable === 'YES'
          ? `UPDATE ${quoteIdentifier(table)} SET ${quoteIdentifier(column)} = NULL WHERE ${quoteIdentifier(column)} = ?`
          : `DELETE FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} = ?`;
        const [result] = await connection.query(statement, [id]);
        if (nullable !== 'YES') deletedRelatedRecords += result.affectedRows;
      }

      const [deletedTeam] = await connection.query('DELETE FROM teams WHERE team_id = ?', [id]);
      if (deletedTeam.affectedRows !== 1) {
        throw new Error(`Team with ID ${id} could not be deleted.`);
      }

      await connection.commit();
      transactionStarted = false;

      const matchMessage = matches.length > 0
        ? ` and ${matches.length} linked match${matches.length === 1 ? '' : 'es'} with dependent records`
        : '';
      res.status(200).json({
        success: true,
        message: `Team '${existing[0].team_name}' deleted successfully${matchMessage}`,
        data: {
          deleted_matches: matches.length,
          deleted_related_records: deletedRelatedRecords
        }
      });
    } catch (dbError) {
      if (transactionStarted) {
        await connection.rollback();
      }
      throw dbError;
    } finally {
      connection.release();
    }
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
        p.team_id,
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
