# SQL Query Reference

This document describes the SQL used by the IPL Management System, what each
query family does, and where it is used. It covers the database definition and
seed scripts, the migration script, and the API routes actually mounted by the
server. Runtime queries use MySQL parameter placeholders (`?`) for values.

## Application routes covered

The server mounts the following API routers in
[routes/index.js](../server/src/routes/index.js):

| API prefix | Purpose |
|---|---|
| `/api/teams` | Team information, captains, and team rosters |
| `/api/players` | Player profiles |
| `/api/matches` | Match schedule and match lifecycle |
| `/api/seasons` | Season list |
| `/api/venues` | Venue list |
| `/api/player-statistics` | Career summaries and per-match player records |
| `/api/team-statistics` | Season standings |

The SQL shown below is grouped by user-visible operation. A query may have
optional filters; those predicates are added only when the corresponding
request parameter is supplied.

## Database setup and sample data

### Schema creation

[schema.sql](../database/schema.sql) creates the six main tables and the
`v_match_details` view.

| DDL/query | Purpose |
|---|---|
| `CREATE TABLE venues` | Stores stadium name, city, country, capacity, pitch type, and establishment year. |
| `CREATE TABLE seasons` | Stores season year, dates, host country, and season totals. |
| `CREATE TABLE teams` | Stores team identity, home venue, coach, captain, jersey color, founding year, and titles. |
| `CREATE TABLE players` | Stores player profiles, team assignment, role, style, and profile-level career totals. |
| `CREATE TABLE matches` | Stores each fixture, participating teams, venue, season, result, and player of the match. |
| `CREATE TABLE player_match` | Stores one player's performance in a match. `(match_id, player_id)` is unique. |
| `ALTER TABLE teams ... fk_team_captain` | Adds the captain-to-player foreign key; deleting a captain sets `captain_id` to `NULL`. |
| `CREATE VIEW v_match_details` | Joins a match to its season, venue, participating teams, winner, and player of the match for readable match results. |
| `USE ipl_management; SELECT * FROM teams ORDER BY team_id DESC;` | Selects the database and displays teams newest-first; this is a convenience query, not application logic. |

The schema's primary keys and foreign keys maintain entity relationships.
`CHECK` constraints enforce valid ranges and enumerated values such as match
status, player role, and named jersey colors.

### Seed data

[seed.sql](../database/seed.sql) contains bulk `INSERT` statements for venues,
seasons, teams, players, matches, and `player_match` performance rows. It also
contains an `UPDATE teams ... JOIN players ...` statement that assigns team
captains by matching the seed player to each team. These statements are for
initial sample data, not the runtime API.

## Runtime query catalog

### Teams

Source: [teamsController.js](../server/src/controllers/teamsController.js)
and [teams.js](../server/src/routes/teams.js).

| API / controller function | SQL operation and purpose | Tables |
|---|---|---|
| `GET /api/teams` — `getAllTeams()` | `SELECT` teams, `LEFT JOIN` venue and captain player for display. Optional search matches team name, short name, or city; results sort by team name. | `teams`, `venues`, `players` |
| `GET /api/teams/:id` — `getTeamById()` | `SELECT` one team with its venue and captain display names by `team_id`. | `teams`, `venues`, `players` |
| `GET /api/teams/:id/players` — `getTeamPlayers()` | `SELECT` verifies the team exists, then selects its roster ordered by role and player name. | `teams`, `players` |
| `POST /api/teams` — `createTeam()` | `SELECT` checks a supplied home venue exists; `INSERT` creates the team; `SELECT` returns the inserted row using `insertId`. | `venues`, `teams` |
| `PUT /api/teams/:id` — `updateTeam()` | `SELECT` loads the existing team and checks selected venue/captain; `UPDATE` changes team fields; `SELECT` returns the updated row. The captain must be an existing player assigned to that same team. | `teams`, `venues`, `players` |
| `DELETE /api/teams/:id` — `deleteTeam()` | In a transaction, `SELECT ... FOR UPDATE` locks the team and its linked matches. It finds match-dependent tables through `information_schema`, `DELETE`s their rows and linked matches, then finds team foreign-key references. Nullable references are `UPDATE`d to `NULL`, non-nullable team-linked rows are deleted, and finally the team is deleted. | `teams`, `matches`, dependent tables, `information_schema` |

The team deletion query intentionally deletes linked match history. Player
profiles are not deleted by this operation; their team association is handled
according to the database's foreign-key rules and discovered references.
Because this deletion discovers foreign keys at runtime, its dependent-table
behavior can include tables in the live database that are not declared in the
checked-in six-table schema.

### Players

Source: [playersController.js](../server/src/controllers/playersController.js)
and [players.js](../server/src/routes/players.js).

| API / controller function | SQL operation and purpose | Tables |
|---|---|---|
| `GET /api/players` — `getAllPlayers()` | `SELECT`s player profiles and `LEFT JOIN`s team name, short name, and jersey color. Optional predicates filter by team, role, active state, and a name/nationality search. | `players`, `teams` |
| `GET /api/players/:id` — `getPlayerById()` | `SELECT`s one player with their team's display details. | `players`, `teams` |
| `POST /api/players` — `createPlayer()` | `SELECT` checks an optional team exists; `INSERT` creates the profile; `SELECT` returns the inserted player and team details. | `teams`, `players` |
| `PUT /api/players/:id` — `updatePlayer()` | `SELECT`s the current profile, validates a supplied team, and checks whether the player is currently a captain before changing team assignment. `UPDATE`s the profile and selects the updated player with team details. | `players`, `teams` |
| `DELETE /api/players/:id` — `deletePlayer()` | In a transaction, `UPDATE`s any `matches.player_of_match` reference to `NULL`, `DELETE`s the player's match-performance rows, then deletes the player. | `matches`, `player_match`, `players` |

### Matches

Source: [matchesController.js](../server/src/controllers/matchesController.js)
and [matches.js](../server/src/routes/matches.js).

| API / controller function | SQL operation and purpose | Tables |
|---|---|---|
| `GET /api/matches` — `getAllMatches()` | `SELECT`s match summaries from `v_match_details`, joining `matches` for IDs and filterable fields. Optional filters are season, either participating team, status, and venue. | `v_match_details`, `matches` (the view joins `seasons`, `venues`, and `teams`) |
| `GET /api/matches/:id` — `getMatchById()` | `SELECT`s one joined match summary by match ID. | `v_match_details`, `matches` |
| `POST /api/matches` — `createMatch()` | Uses validation `SELECT`s to confirm the season, venue, and both distinct teams exist; `INSERT` creates the fixture with type `League` and the requested/default status; `SELECT` returns the created match summary. | `seasons`, `venues`, `teams`, `matches`, `v_match_details` |
| `PUT /api/matches/:id` — `updateMatch()` | `SELECT` loads the match and checks that the final season/venue/teams exist and differ; another `SELECT` ensures existing `player_match` rows belong to one of the final participating teams. `UPDATE` changes the match and `SELECT` returns its joined summary. | `matches`, `seasons`, `venues`, `teams`, `player_match`, `v_match_details` |
| `DELETE /api/matches/:id` — `deleteMatch()` | In a transaction, `DELETE`s the match's `player_match` rows and then the match row. | `player_match`, `matches` |

The match creation operation inserts the row with this parameterized query
(values are supplied separately by the controller):

```sql
INSERT INTO matches (
  season_id, venue_id, team1_id, team2_id,
  match_date, match_time, match_type, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
```

The joined detail view is defined in [schema.sql](../database/schema.sql) as
`v_match_details`; it keeps repeated match display joins in one reusable
database object.

### Player statistics and per-match records

Source:
[playerStatisticsController.js](../server/src/controllers/playerStatisticsController.js)
and [playerStatistics.js](../server/src/routes/playerStatistics.js).

| API / controller function | SQL operation and purpose | Tables |
|---|---|---|
| `GET /api/player-statistics` — `getPlayerStatistics()` | Groups player match rows by player and sums runs, wickets, and balls faced; counts entries and distinct matches; also selects profile totals. The API uses recorded match totals when records exist and profile totals otherwise, and calculates batting average and strike rate. | `players`, `teams`, `player_match` |
| `GET /api/player-statistics/records` — `getMatchRecords()` | `SELECT`s per-match performance rows joined to player, team, match date, and both match opponents. | `player_match`, `players`, `teams`, `matches` |
| `POST /api/player-statistics/records` — `createMatchRecord()` | `SELECT`s verify the selected team participates in the match and the selected player belongs to that team; `INSERT` creates the performance metrics; `SELECT` returns the inserted row. | `matches`, `players`, `player_match` |
| `PUT /api/player-statistics/records/:id` — `updateMatchRecord()` | `SELECT`s the current record and validates final match/player/team associations; `UPDATE`s associations and metrics; `SELECT` returns the updated row. | `player_match`, `matches`, `players` |
| `DELETE /api/player-statistics/records/:id` — `deleteMatchRecord()` | `DELETE`s one performance row by its record ID. | `player_match` |

`player_match` is the source for match-by-match statistics. `players` also
contains profile-level career totals that serve as a fallback when a player has
no `player_match` rows.

### Team standings

Source:
[teamStatisticsController.js](../server/src/controllers/teamStatisticsController.js)
and [teamStatistics.js](../server/src/routes/teamStatistics.js).

| API / controller function | SQL operation and purpose | Tables |
|---|---|---|
| `GET /api/team-statistics?season_id=...` — `getTeamStatistics()` | `SELECT` retrieves the requested season. If no season is specified, it retrieves the season with the maximum year. | `seasons` |
| Team standings query in `getTeamStatistics()` | For each team, correlated `COUNT(*)` subqueries calculate matches played, wins, losses, and no-results for the chosen season. The API calculates points, win percentage, and standings position from those counts. | `teams`, `matches` |

This endpoint's application scoring rules are: two points per win, one point
per no-result, then ordering by points, wins, win percentage, and team name.

### Seasons and venues

Sources:
[seasonsController.js](../server/src/controllers/seasonsController.js),
[seasons.js](../server/src/routes/seasons.js),
[venuesController.js](../server/src/controllers/venuesController.js), and
[venues.js](../server/src/routes/venues.js).

The currently mounted `GET /api/seasons` query selects `season_id` and
`season_year` ordered newest-first from `seasons`. The currently mounted
`GET /api/venues` query selects `venue_id`, `venue_name`, and `city` ordered by
venue name from `venues`.

The controllers also contain additional detail, CRUD, venue-match, and venue
statistics queries. Those functions are not exposed by the mounted routers:
the seasons router currently mounts only `GET /`, and the venues router
currently mounts only `GET /`. They are not active API operations.

## Migration queries

[migrateTeamData.js](../server/scripts/migrateTeamData.js) is an idempotent
database migration. It:

1. Reads `information_schema.tables`, `information_schema.columns`,
   `information_schema.key_column_usage`, and
   `information_schema.table_constraints` to determine whether required tables,
   the `teams.captain_id` column, the captain foreign key, and the named-color
   check constraint exist.
2. Adds the captain column and foreign key when missing.
3. Reads each team's `jersey_color`, maps legacy values to the supported named
   palette in application code, and updates each non-null color inside a
   transaction.
4. Adds the color check constraint when missing.

The migration's `ALTER TABLE` and `UPDATE` statements are maintenance queries;
they are not run for each API request.

## Query safety and transaction notes

- Request data is passed as bound values using `?` placeholders rather than
  concatenated into SQL.
- Dynamic table and column names are only used for foreign-key cleanup in team
  deletion. They are discovered from MySQL metadata and quoted by the
  controller's identifier-quoting helper.
- Team deletion, match deletion, and player deletion use transactions so their
  dependent-row changes succeed or roll back together.

## Scope notes

- The checked-in schema defines the six tables listed above. A live database
  may contain additional legacy tables; those are not implied by this schema
  document.
- These controller files contain additional SQL, but their routes are not
  mounted in [routes/index.js](../server/src/routes/index.js), so those
  statements are not executed through the current API:

  | Controller file | Query area |
  |---|---|
  | [dashboardController.js](../server/src/controllers/dashboardController.js) | Summary counts, recent/upcoming matches, and all-time top-team metrics |
  | [awardsController.js](../server/src/controllers/awardsController.js) | Awards |
  | [inningsController.js](../server/src/controllers/inningsController.js) | Innings and score data |
  | [ownersController.js](../server/src/controllers/ownersController.js) | Team ownership |
  | [sponsorsController.js](../server/src/controllers/sponsorsController.js) | Sponsors |
  | [umpiresController.js](../server/src/controllers/umpiresController.js) | Umpires |
  | [reportsController.js](../server/src/controllers/reportsController.js) | Report queries |

  Some of these legacy controllers refer to tables beyond the six-table checked
  in schema. The table definitions and SQL in those controllers should be
  treated separately from the mounted application behavior documented above.
- The SQL examples are described by purpose rather than copied as one long
  listing, so this reference stays readable while pointing to each
  authoritative implementation.
