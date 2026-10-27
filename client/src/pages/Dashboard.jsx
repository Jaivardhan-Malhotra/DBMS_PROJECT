import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Swords,
  Calendar,
  MapPin,
  UserCheck,
  Trophy,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getJerseyColorHex } from '../constants/teamColors';

const Dashboard = () => {
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    matches: 0,
    seasons: 0,
    venues: 0,
    umpires: 0,
  });
  const [recentMatches, setRecentMatches] = useState([]);
  const [topTeams, setTopTeams] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // All four frontend helpers hit the same /dashboard/stats endpoint,
      // which returns: { success, data: { summary, recent_matches, upcoming_matches, top_teams_by_wins } }
      const res = await dashboardAPI.getStats();
      const payload = res?.data?.data || res?.data || {};

      const summary = payload.summary || {};
      setStats({
        teams:    Number(summary.total_teams   || 0),
        players:  Number(summary.total_players || 0),
        matches:  Number(summary.total_matches || 0),
        seasons:  Number(summary.total_seasons || 0),
        venues:   Number(summary.total_venues  || 0),
        umpires:  Number(summary.total_umpires || 0),
      });

      setRecentMatches(payload.recent_matches      || []);
      setTopTeams(     payload.top_teams_by_wins   || []);
      setUpcomingMatches(payload.upcoming_matches  || []);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchDashboardData();

    const handleRefresh = () => fetchDashboardData();
    window.addEventListener('ipl-data-refresh', handleRefresh);
    return () => window.removeEventListener('ipl-data-refresh', handleRefresh);
  }, [fetchDashboardData]);

  if (loading) {
    return <LoadingSpinner message="Loading tournament overview..." />;
  }

  // Calculate maximum wins for the top teams bar chart
  const maxWins = topTeams.length > 0 ? Math.max(...topTeams.map((t) => Number(t.total_wins || t.wins || 1))) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
          borderColor: 'rgba(249, 115, 22, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            IPL Tournament Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Real-time statistics, match fixtures, franchise performance, and tournament analytics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/matches" className="btn btn-primary btn-sm">
            <Swords size={16} />
            <span>Manage Matches</span>
          </Link>
          <Link to="/reports" className="btn btn-secondary btn-sm">
            <Trophy size={16} />
            <span>View Reports</span>
          </Link>
        </div>
      </div>

      {/* Row 1: 6 Stat Cards */}
      <div className="grid-6">
        <StatCard
          title="Franchises"
          value={stats.teams || 0}
          icon={Shield}
          color="#f97316"
          subtitle="Registered Teams"
        />
        <StatCard
          title="Players"
          value={stats.players || 0}
          icon={Users}
          color="#3b82f6"
          subtitle="Squad Roster"
        />
        <StatCard
          title="Matches"
          value={stats.matches || 0}
          icon={Swords}
          color="#22c55e"
          subtitle="Total Fixtures"
        />
        <StatCard
          title="Seasons"
          value={stats.seasons || 0}
          icon={Calendar}
          color="#eab308"
          subtitle="Tournaments"
        />
        <StatCard
          title="Venues"
          value={stats.venues || 0}
          icon={MapPin}
          color="#a855f7"
          subtitle="Host Stadiums"
        />
        <StatCard
          title="Officials"
          value={stats.umpires || 0}
          icon={UserCheck}
          color="#06b6d4"
          subtitle="Umpires & Referees"
        />
      </div>

      {/* Row 2: Recent Completed Matches */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <CheckCircle2 size={20} color="var(--success)" />
              Recent Completed Matches
            </h3>
            <p className="card-subtitle">Last 5 tournament encounters and official outcomes</p>
          </div>
          <Link to="/matches" className="btn btn-secondary btn-sm">
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <EmptyState message="No recent completed matches found" icon={Swords} />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Match Type</th>
                  <th>Fixture</th>
                  <th>Venue</th>
                  <th>Winner</th>
                  <th>Result Summary</th>
                </tr>
              </thead>
              <tbody>
                {recentMatches.slice(0, 5).map((match) => (
                  <tr key={match.match_id}>
                    <td>{new Date(match.match_date).toLocaleDateString()}</td>
                    <td>
                      <Badge variant="purple" label={match.match_type || 'League'} />
                    </td>
                    <td className="text-primary" style={{ fontWeight: 600 }}>
                      {match.team1_short || match.team1_name} vs {match.team2_short || match.team2_name}
                    </td>
                    <td>{match.venue_name || match.city || '-'}</td>
                    <td>
                      {match.winner_name ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                          🏆 {match.winner_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No Result</span>
                      )}
                    </td>
                    <td>
                      {match.win_margin ? (
                        <span>
                          Won by {match.win_margin} {match.win_type || 'Runs'}
                        </span>
                      ) : (
                        match.status || 'Completed'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Row 3: Top Teams by Wins & Upcoming Matches */}
      <div className="grid-2">
        {/* Top 5 Teams by Wins */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Trophy size={20} color="#f97316" />
                Top Teams by Wins
              </h3>
              <p className="card-subtitle">Franchise victory leaders in tournament history</p>
            </div>
            <Link to="/teams" className="btn btn-secondary btn-sm">
              All Teams
            </Link>
          </div>

          {topTeams.length === 0 ? (
            <EmptyState message="No team win stats available" icon={Shield} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {topTeams.slice(0, 5).map((team, idx) => {
                const wins = Number(team.total_wins || team.wins || 0);
                const percent = Math.round((wins / (maxWins || 1)) * 100);

                return (
                  <div key={team.team_id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{idx + 1}</span>
                        <span style={{ color: getJerseyColorHex(team.jersey_color) }}>
                          {team.team_name} ({team.short_name})
                        </span>
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {wins} Wins
                      </span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${percent}%`,
                          background: idx === 0
                            ? 'linear-gradient(90deg, #f97316 0%, #fbbf24 100%)'
                            : 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Matches */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                <Clock size={20} color="#3b82f6" />
                Upcoming Matches
              </h3>
              <p className="card-subtitle">Scheduled fixtures on the calendar</p>
            </div>
            <Link to="/matches" className="btn btn-secondary btn-sm">
              Schedule
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <EmptyState message="No scheduled upcoming matches" icon={Calendar} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingMatches.slice(0, 4).map((match) => (
                <div
                  key={match.match_id}
                  style={{
                    padding: '0.9rem 1.1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      {match.team1_short || match.team1_name} vs {match.team2_short || match.team2_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>📅 {new Date(match.match_date).toLocaleDateString()}</span>
                      {match.match_time && <span>⏰ {match.match_time}</span>}
                    </div>
                  </div>
                  <div>
                    <Badge variant="info" label={match.venue_city || match.venue_name || 'TBD'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
