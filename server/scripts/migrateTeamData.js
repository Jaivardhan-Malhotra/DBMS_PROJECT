const jerseyColors = require('../../database/team-colors.json');
const pool = require('../src/config/database');

const legacyColorNames = {
  'blue & gold': 'Blue',
  'yellow & blue': 'Yellow',
  'red & black': 'Red',
  'purple & gold': 'Purple',
  'pink & blue': 'Pink',
  'orange & black': 'Orange',
  'red & silver': 'Red',
  'blue & red': 'Blue',
  'blue & navy': 'Navy',
  'teal & gold': 'Teal',
};

const colorByName = new Map(jerseyColors.map(({ name, hex }) => [name.toLowerCase(), { name, hex }]));

const nearestNamedColor = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).trim().toLowerCase();
  if (colorByName.has(normalized)) return colorByName.get(normalized).name;
  if (legacyColorNames[normalized]) return legacyColorNames[normalized];

  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) {
    throw new Error(`Cannot map existing jersey color "${value}" to the named palette.`);
  }

  const digits = normalized.slice(1);
  const rgb = digits.length === 3
    ? [...digits].map((digit) => parseInt(digit + digit, 16))
    : [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16));

  return jerseyColors.reduce((closest, color) => {
    const candidate = color.hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16));
    const distance = rgb.reduce((sum, channel, index) => sum + (channel - candidate[index]) ** 2, 0);
    return distance < closest.distance ? { name: color.name, distance } : closest;
  }, { name: jerseyColors[0].name, distance: Infinity }).name;
};

const migrate = async () => {
  const connection = await pool.getConnection();
  try {
    const [tables] = await connection.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name IN ('teams', 'players')
    `);
    if (tables.length !== 2) {
      throw new Error('The selected database must contain both teams and players tables.');
    }

    const [captainColumn] = await connection.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'teams' AND column_name = 'captain_id'
    `);
    if (captainColumn.length === 0) {
      await connection.query('ALTER TABLE teams ADD COLUMN captain_id INT NULL AFTER coach');
    }

    const [captainForeignKey] = await connection.query(`
      SELECT constraint_name
      FROM information_schema.key_column_usage
      WHERE constraint_schema = DATABASE()
        AND table_name = 'teams'
        AND column_name = 'captain_id'
        AND referenced_table_name = 'players'
    `);
    if (captainForeignKey.length === 0) {
      await connection.query(`
        ALTER TABLE teams
        ADD CONSTRAINT fk_team_captain
        FOREIGN KEY (captain_id) REFERENCES players(player_id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    const [teams] = await connection.query('SELECT team_id, jersey_color FROM teams');
    const updates = teams.map(({ team_id, jersey_color }) => ({
      teamId: team_id,
      colorName: nearestNamedColor(jersey_color),
    }));

    await connection.beginTransaction();
    try {
      for (const { teamId, colorName } of updates) {
        if (colorName !== null) {
          await connection.query('UPDATE teams SET jersey_color = ? WHERE team_id = ?', [colorName, teamId]);
        }
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }

    const [colorConstraint] = await connection.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'teams'
        AND constraint_name = 'chk_teams_jersey_color'
        AND constraint_type = 'CHECK'
    `);
    if (colorConstraint.length === 0) {
      const allowedColors = jerseyColors.map(({ name }) => `'${name}'`).join(', ');
      await connection.query(`
        ALTER TABLE teams
        ADD CONSTRAINT chk_teams_jersey_color
        CHECK (jersey_color IS NULL OR jersey_color IN (${allowedColors}))
      `);
    }

    console.log(`Team data migration complete (${teams.length} team colors checked).`);
  } finally {
    connection.release();
    await pool.end();
  }
};

migrate().catch((error) => {
  console.error('Team data migration failed:', error.message);
  process.exitCode = 1;
});
