import React, { useCallback, useEffect, useState } from 'react';
import { ListOrdered, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { seasonsAPI, teamStatisticsAPI } from '../services/api';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { getJerseyColorHex } from '../constants/teamColors';

const TeamStatistics = () => {
  const [standings, setStandings] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStandings = useCallback(async (seasonId = '') => {
    try {
      setLoading(true);
      const response = await teamStatisticsAPI.getAll(
        seasonId ? { season_id: seasonId } : undefined
      );
      setStandings(response.data.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load team standings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    seasonsAPI.getAll({ limit: 100 })
      .then((response) => setSeasons(response.data.data || []))
      .catch((error) => toast.error(error.message || 'Failed to load seasons'));
  }, []);

  useEffect(() => {
    fetchStandings(selectedSeason);
    const handleRefresh = () => fetchStandings(selectedSeason);
    window.addEventListener('ipl-data-refresh', handleRefresh);
    return () => window.removeEventListener('ipl-data-refresh', handleRefresh);
  }, [fetchStandings, selectedSeason]);

  const columns = [
    {
      key: 'standings_position',
      label: 'Pos.',
      render: (value) => <strong>#{value}</strong>,
    },
    {
      key: 'team_name',
      label: 'Team',
      className: 'text-primary',
      render: (value, row) => (
        <div>
          <strong style={{ color: getJerseyColorHex(row.jersey_color) }}>{value}</strong>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{row.short_name} · {row.city}</div>
        </div>
      ),
    },
    { key: 'total_matches_played', label: 'Played' },
    { key: 'matches_won', label: 'Won', render: (value) => <strong style={{ color: 'var(--success)' }}>{value}</strong> },
    { key: 'matches_lost', label: 'Lost' },
    {
      key: 'win_percentage',
      label: 'Win %',
      render: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      key: 'titles_won',
      label: 'Titles',
      render: (value) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Trophy size={14} color="var(--warning)" /> {value || 0}
        </span>
      ),
    },
    {
      key: 'points',
      label: 'Points',
      render: (value) => <strong style={{ color: 'var(--accent-primary)' }}>{value}</strong>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ListOrdered size={24} /> Team Statistics & Standings
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Results-derived win/loss records and points table. Defaults to the latest season; scheduled and cancelled fixtures do not count as played.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select
          className="form-control"
          style={{ maxWidth: 240 }}
          value={selectedSeason}
          onChange={(event) => setSelectedSeason(event.target.value)}
          aria-label="Choose standings season"
        >
          <option value="">Latest season</option>
          {seasons.map((season) => (
            <option key={season.season_id} value={season.season_id}>IPL {season.season_year}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        {loading ? (
          <LoadingSpinner message="Calculating team standings from match results..." />
        ) : (
          <DataTable
            columns={columns}
            data={standings}
            emptyMessage="No team statistics are available."
          />
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.75rem' }}>
          Points use 2 per win and 1 per no-result. Win percentage is calculated from decided matches only.
          Standings for IPL {standings[0]?.season_year || 'the selected season'} are ordered by points, wins,
          win percentage, then team name.
        </p>
      </div>
    </div>
  );
};

export default TeamStatistics;
