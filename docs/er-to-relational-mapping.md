# ER-to-Relational Mapping — IPL Management System

The database schema contains only tables used by the currently mounted application routes.

## Entities

| Table | Purpose | Primary key |
|---|---|---|
| `venues` | Stadium details used when scheduling matches | `venue_id` |
| `seasons` | Season year, date range, and competition totals | `season_id` |
| `teams` | IPL team details and home venue | `team_id` |
| `players` | Player profile, team assignment, and career totals | `player_id` |
| `matches` | Match schedule and result details | `match_id` |
| `player_match` | A player's performance record for one match | `id` |

## Relationships

- `teams.home_venue_id` references `venues.venue_id`.
- `players.team_id` references `teams.team_id`; a player can be unassigned.
- `matches.season_id` references `seasons.season_id`.
- `matches.venue_id` references `venues.venue_id`.
- `matches.team1_id`, `matches.team2_id`, `matches.winner_id`, and `matches.toss_winner_id` reference `teams.team_id`.
- `matches.player_of_match` references `players.player_id`.
- `player_match.match_id`, `player_id`, and `team_id` reference the corresponding match, player, and team.
- `player_match` has a unique constraint on `(match_id, player_id)` so a player has at most one record per match.

## Integrity constraints and view

The tables use `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, and `CHECK` constraints for identity, relationships, uniqueness, required values, and valid domain values. `v_match_details` joins matches with seasons, venues, participating teams, the winner, and player of the match for the schedule endpoints.

Primary keys use MySQL `AUTO_INCREMENT` because the API create operations rely on database-generated IDs. The schema otherwise uses the course-listed SQL data types and concepts.
