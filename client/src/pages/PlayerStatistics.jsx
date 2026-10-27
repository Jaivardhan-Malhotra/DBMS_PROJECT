import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Edit2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  matchesAPI,
  playerStatisticsAPI,
  playersAPI,
  teamsAPI,
} from '../services/api';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import FormField from '../components/FormField';
import Modal from '../components/Modal';
import SearchFilter from '../components/SearchFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import { getJerseyColorHex } from '../constants/teamColors';

const emptyRecord = {
  match_id: '',
  player_id: '',
  team_id: '',
  runs_scored: 0,
  balls_faced: 0,
  wickets_taken: 0,
  is_out: 0,
};

const numericFields = [
  ['runs_scored', 'Runs scored', 65535],
  ['balls_faced', 'Balls faced', 65535],
  ['wickets_taken', 'Wickets taken', 255],
];

const PlayerStatistics = () => {
  const [statistics, setStatistics] = useState([]);
  const [records, setRecords] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, recordsRes, matchesRes, playersRes, teamsRes] = await Promise.all([
        playerStatisticsAPI.getAll(),
        playerStatisticsAPI.getMatchRecords(),
        matchesAPI.getAll({ limit: 100 }),
        playersAPI.getAll({ limit: 100 }),
        teamsAPI.getAll({ limit: 100 }),
      ]);
      setStatistics(statsRes.data.data || []);
      setRecords(recordsRes.data.data || []);
      setMatches(matchesRes.data.data || []);
      setPlayers(playersRes.data.data || []);
      setTeams(teamsRes.data.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load player statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handleRefresh = () => fetchData();
    window.addEventListener('ipl-data-refresh', handleRefresh);
    return () => window.removeEventListener('ipl-data-refresh', handleRefresh);
  }, [fetchData]);

  const filteredStatistics = useMemo(() => statistics.filter((player) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query
      || player.player_name?.toLowerCase().includes(query)
      || player.team_name?.toLowerCase().includes(query);
    const matchesTeam = !teamFilter || String(player.team_id) === teamFilter;
    return matchesSearch && matchesTeam;
  }), [statistics, search, teamFilter]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    const query = recordSearch.trim().toLowerCase();
    return !query
      || record.player_name?.toLowerCase().includes(query)
      || record.team_name?.toLowerCase().includes(query)
      || record.team1_short?.toLowerCase().includes(query)
      || record.team2_short?.toLowerCase().includes(query);
  }), [records, recordSearch]);

  const openAdd = () => {
    const defaultMatch = matches[0];
    const defaultTeamId = defaultMatch ? String(defaultMatch.team1_id) : '';
    const defaultPlayer = players.find((player) => String(player.team_id) === defaultTeamId);
    setSelectedRecord(null);
    setFormData({
      ...emptyRecord,
      match_id: defaultMatch ? String(defaultMatch.match_id) : '',
      team_id: defaultTeamId,
      player_id: defaultPlayer ? String(defaultPlayer.player_id) : '',
    });
    setIsFormOpen(true);
  };

  const openEdit = (record) => {
    setSelectedRecord(record);
    setFormData({
      match_id: String(record.match_id),
      player_id: String(record.player_id),
      team_id: String(record.team_id),
      runs_scored: record.runs_scored,
      balls_faced: record.balls_faced,
      wickets_taken: record.wickets_taken,
      is_out: Number(record.is_out),
    });
    setIsFormOpen(true);
  };

  const selectedMatch = matches.find((match) => String(match.match_id) === formData.match_id);
  const matchTeams = teams.filter((team) => selectedMatch
    && [String(selectedMatch.team1_id), String(selectedMatch.team2_id)].includes(String(team.team_id)));
  const teamPlayers = players.filter((player) => (
    String(player.team_id) === formData.team_id
    || (selectedRecord
      && Number(player.player_id) === Number(selectedRecord.player_id)
      && String(selectedRecord.team_id) === formData.team_id)
  ));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!formData.match_id || !formData.player_id || !formData.team_id) {
      toast.error('Select a match, participating team, and player.');
      return;
    }
    const invalidMetric = numericFields.find(([field, , max]) => {
      const value = Number(formData[field] ?? 0);
      return !Number.isInteger(value) || value < 0 || value > max;
    });
    if (invalidMetric) {
      toast.error(`${invalidMetric[1]} must be a whole number between 0 and ${invalidMetric[2]}.`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        match_id: Number(formData.match_id),
        player_id: Number(formData.player_id),
        team_id: Number(formData.team_id),
        ...Object.fromEntries([
          'runs_scored', 'balls_faced', 'wickets_taken', 'is_out',
        ].map((field) => [field, Number(formData[field] || 0)])),
      };
      if (selectedRecord) {
        await playerStatisticsAPI.updateMatchRecord(selectedRecord.id, payload);
        toast.success('Player match statistics updated.');
      } else {
        await playerStatisticsAPI.createMatchRecord(payload);
        toast.success('Player match statistics added.');
      }
      setIsFormOpen(false);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to save player statistics');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setSubmitting(true);
    try {
      await playerStatisticsAPI.deleteMatchRecord(recordToDelete.id);
      toast.success('Player match record deleted.');
      setRecordToDelete(null);
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to delete player match record');
    } finally {
      setSubmitting(false);
    }
  };

  const statColumns = [
    { key: 'player_name', label: 'Player', className: 'text-primary' },
    {
      key: 'team_name',
      label: 'Team',
      render: (value, row) => (
        <span style={{ color: getJerseyColorHex(
          teams.find((team) => String(team.team_id) === String(row.team_id))?.jersey_color,
          'var(--text-secondary)'
        ) }}>
          {value || 'Free Agent'}
        </span>
      ),
    },
    { key: 'matches_played', label: 'Matches' },
    { key: 'runs_scored', label: 'Runs' },
    { key: 'wickets_taken', label: 'Wickets' },
    {
      key: 'batting_average',
      label: 'Batting Average',
      render: (value) => value === null || value === undefined ? 'N/A' : Number(value).toFixed(2),
    },
    {
      key: 'strike_rate',
      label: 'Strike Rate',
      render: (value) => value === null || value === undefined ? 'N/A' : Number(value).toFixed(2),
    },
    {
      key: 'stats_source',
      label: 'Source',
      render: (value, row) => value === 'Match records'
        ? `${value} (${row.recorded_matches})`
        : 'Profile totals',
    },
  ];

  const recordColumns = [
    {
      key: 'match_date',
      label: 'Match',
      render: (value, row) => (
        <div>
          <strong>{row.team1_short} vs {row.team2_short}</strong>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            {value ? new Date(value).toLocaleDateString() : 'Date unavailable'}
          </div>
        </div>
      ),
    },
    { key: 'player_name', label: 'Player', className: 'text-primary' },
    {
      key: 'team_name',
      label: 'Team',
      render: (value, row) => (
        <span style={{ color: getJerseyColorHex(
          teams.find((team) => String(team.team_id) === String(row.team_id))?.jersey_color,
          'var(--text-secondary)'
        ) }}>
          {value || 'Free Agent'}
        </span>
      ),
    },
    { key: 'runs_scored', label: 'Runs', render: (value, row) => `${value} runs (${row.balls_faced} balls)` },
    { key: 'wickets_taken', label: 'Wickets' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn-icon" aria-label="Edit performance" onClick={() => openEdit(row)}>
            <Edit2 size={16} />
          </button>
          <button type="button" className="btn-icon" aria-label="Delete performance" onClick={() => setRecordToDelete(row)}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Player Statistics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Matches, runs, wickets, batting average, and strike rate are calculated from match records when available.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd} disabled={!matches.length || !players.length}>
          <Plus size={18} /> Add Statistics Record
        </button>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <h3 style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} /> Career summary
        </h3>
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search players or teams..."
          filters={[{
            key: 'team',
            label: 'All Teams',
            value: teamFilter,
            options: teams.map((team) => ({ label: team.team_name, value: String(team.team_id) })),
          }]}
          onFilterChange={(_, value) => setTeamFilter(value)}
        />
        {loading ? (
          <LoadingSpinner message="Calculating player statistics..." />
        ) : (
          <DataTable columns={statColumns} data={filteredStatistics} emptyMessage="No player statistics found." />
        )}
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div>
            <h3>Match performance records</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Add or update only the match figures needed for player statistics.
            </p>
          </div>
          <input
            className="form-control"
            style={{ maxWidth: 280 }}
            value={recordSearch}
            onChange={(event) => setRecordSearch(event.target.value)}
            placeholder="Search scorecards..."
            aria-label="Search scorecards"
          />
        </div>
        {loading ? (
          <LoadingSpinner message="Loading match records..." />
        ) : (
          <DataTable columns={recordColumns} data={filteredRecords} emptyMessage="No player match records yet." />
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => !submitting && setIsFormOpen(false)}
        title={selectedRecord ? 'Edit Match Performance' : 'Record Match Performance'}
        size="lg"
      >
        <form onSubmit={handleSave}>
          <div className="form-row">
            <FormField label="Match" required>
              <select
                className="form-control"
                value={formData.match_id}
                onChange={(event) => {
                  const matchId = event.target.value;
                  const match = matches.find((item) => String(item.match_id) === matchId);
                  const nextTeamId = match ? String(match.team1_id) : '';
                  const nextPlayer = players.find((player) => String(player.team_id) === nextTeamId);
                  setFormData((current) => ({
                    ...current,
                    match_id: matchId,
                    team_id: nextTeamId,
                    player_id: nextPlayer ? String(nextPlayer.player_id) : '',
                  }));
                }}
                required
              >
                <option value="">Select match</option>
                {matches.map((match) => (
                  <option key={match.match_id} value={match.match_id}>
                    {match.team1_short || match.team1_name} vs {match.team2_short || match.team2_name}
                    {' — '}{match.match_date ? new Date(match.match_date).toLocaleDateString() : ''}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Participating Team" required>
              <select
                className="form-control"
                value={formData.team_id}
                onChange={(event) => {
                  const teamId = event.target.value;
                  const nextPlayer = players.find((player) => String(player.team_id) === teamId);
                  setFormData((current) => ({
                    ...current,
                    team_id: teamId,
                    player_id: nextPlayer ? String(nextPlayer.player_id) : '',
                  }));
                }}
                required
              >
                <option value="">Select team</option>
                {matchTeams.map((team) => (
                  <option key={team.team_id} value={team.team_id}>{team.team_name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="form-row">
            <FormField label="Player" required>
              <select
                className="form-control"
                value={formData.player_id}
                onChange={(event) => setFormData((current) => ({ ...current, player_id: event.target.value }))}
                required
              >
                <option value="">Select player</option>
                {teamPlayers.map((player) => (
                  <option key={player.player_id} value={player.player_id}>{player.player_name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Dismissed">
              <select
                className="form-control"
                value={formData.is_out}
                onChange={(event) => setFormData((current) => ({ ...current, is_out: event.target.value }))}
              >
                <option value="0">Not out</option>
                <option value="1">Out</option>
              </select>
            </FormField>
          </div>
          <div className="form-row">
            {numericFields.map(([field, label, max]) => (
              <FormField key={field} label={label}>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  max={max}
                  step="1"
                  value={formData[field]}
                  onChange={(event) => setFormData((current) => ({ ...current, [field]: event.target.value }))}
                />
              </FormField>
            ))}
          </div>
          <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedRecord ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        onClose={() => !submitting && setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Match Performance"
        message={recordToDelete
          ? `Delete ${recordToDelete.player_name}'s scorecard for ${recordToDelete.team1_short} vs ${recordToDelete.team2_short}? Career totals will be recalculated.`
          : ''}
        loading={submitting}
      />
    </div>
  );
};

export default PlayerStatistics;
