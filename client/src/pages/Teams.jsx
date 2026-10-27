import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Eye,
  MapPin,
  User,
  Users,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { teamsAPI, venuesAPI } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchFilter from '../components/SearchFilter';
import FormField from '../components/FormField';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Badge from '../components/Badge';
import { JERSEY_COLORS, getJerseyColorHex } from '../constants/teamColors';

const initialForm = {
  team_name: '',
  short_name: '',
  city: '',
  home_venue_id: '',
  captain_id: '',
  coach: '',
  jersey_color: 'Orange',
  founded_year: 2008,
  titles_won: 0,
};

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [captainOptions, setCaptainOptions] = useState([]);
  const [captainLoading, setCaptainLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Form state
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchTeamsAndVenues = useCallback(async () => {
    try {
      setLoading(true);
      const [teamsRes, venuesRes] = await Promise.all([
        teamsAPI.getAll(),
        venuesAPI.getAll(),
      ]);
      setTeams(teamsRes.data.data || []);
      setVenues(venuesRes.data.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load teams data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamsAndVenues();
    const handleRefresh = () => fetchTeamsAndVenues();
    window.addEventListener('ipl-data-refresh', handleRefresh);
    return () => window.removeEventListener('ipl-data-refresh', handleRefresh);
  }, [fetchTeamsAndVenues]);

  const handleOpenAdd = () => {
    setSelectedTeam(null);
    setFormData(initialForm);
    setCaptainOptions([]);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (team) => {
    setSelectedTeam(team);
    setFormData({
      team_name: team.team_name || '',
      short_name: team.short_name || '',
      city: team.city || '',
      home_venue_id: team.home_venue_id || '',
      captain_id: team.captain_id ? String(team.captain_id) : '',
      coach: team.coach || '',
      jersey_color: team.jersey_color || 'Orange',
      founded_year: team.founded_year || 2008,
      titles_won: team.titles_won ?? 0,
    });
    setFormErrors({});
    setCaptainLoading(true);
    try {
      const response = await teamsAPI.getPlayers(team.team_id);
      setCaptainOptions(response.data.data || []);
    } catch (error) {
      setCaptainOptions([]);
      toast.error(error.message || 'Failed to load the team roster for captain selection');
    } finally {
      setCaptainLoading(false);
    }
    setIsFormOpen(true);
  };

  const handleOpenView = async (team) => {
    setSelectedTeam(team);
    setIsViewOpen(true);
    setLoadingPlayers(true);
    try {
      const res = await teamsAPI.getPlayers(team.team_id);
      setTeamPlayers(res.data.data || res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load team players');
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleOpenDelete = (team) => {
    setSelectedTeam(team);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.team_name.trim()) errors.team_name = 'Team name is required';
    else if (formData.team_name.trim().length > 150) errors.team_name = 'Team name cannot exceed 150 characters';
    if (!formData.short_name.trim()) errors.short_name = 'Short name is required';
    else if (formData.short_name.trim().length < 2 || formData.short_name.trim().length > 10) {
      errors.short_name = 'Short name must be between 2 and 10 characters';
    }
    if (!formData.city.trim()) errors.city = 'City is required';
    else if (formData.city.trim().length > 100) errors.city = 'City cannot exceed 100 characters';
    if (formData.coach.trim().length > 100) errors.coach = 'Coach name cannot exceed 100 characters';
    if (!JERSEY_COLORS.some(({ name }) => name === formData.jersey_color)) {
      errors.jersey_color = 'Choose a jersey color from the list';
    }
    const foundedYear = Number(formData.founded_year);
    if (formData.founded_year && (
      !Number.isInteger(foundedYear) || foundedYear < 1900 || foundedYear > 2100
    )) {
      errors.founded_year = 'Enter a valid year';
    }
    const titlesWon = Number(formData.titles_won);
    if (!Number.isInteger(titlesWon) || titlesWon < 0 || titlesWon > 255) {
      errors.titles_won = 'Titles won must be a whole number between 0 and 255';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const { captain_id, ...teamFields } = formData;
      const payload = {
        ...teamFields,
        home_venue_id: formData.home_venue_id ? Number(formData.home_venue_id) : null,
        founded_year: formData.founded_year ? Number(formData.founded_year) : null,
        titles_won: Number(formData.titles_won),
      };

      if (selectedTeam) {
        await teamsAPI.update(selectedTeam.team_id, {
          ...payload,
          captain_id: captain_id ? Number(captain_id) : null,
        });
        toast.success(`Team "${formData.team_name}" updated successfully!`);
      } else {
        await teamsAPI.create(payload);
        toast.success(`Team "${formData.team_name}" created successfully!`);
      }
      setIsFormOpen(false);
      await fetchTeamsAndVenues();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    setSubmitting(true);
    try {
      await teamsAPI.delete(selectedTeam.team_id);
      toast.success(`Team "${selectedTeam.team_name}" deleted.`);
      setIsDeleteOpen(false);
      await fetchTeamsAndVenues();
    } catch (error) {
      toast.error(error.message || 'Failed to delete team');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter teams by search term & city
  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.coach?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = cityFilter ? team.city?.toLowerCase() === cityFilter.toLowerCase() : true;

    return matchesSearch && matchesCity;
  });

  const cityOptions = Array.from(new Set(teams.map((t) => t.city).filter(Boolean))).map((c) => ({
    label: c,
    value: c,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Teams Management</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure IPL franchise squads, team branding, coaches, and home grounds.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Add New Team</span>
        </button>
      </div>

      {/* Filter and Search */}
      <SearchFilter
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search franchise by name, short code, city, coach..."
        filters={[{ key: 'city', label: 'All Cities', options: cityOptions, value: cityFilter }]}
        onFilterChange={(_, val) => setCityFilter(val)}
      />

      {loading ? (
        <LoadingSpinner message="Loading franchise teams..." />
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          message="No franchise teams found matching your query."
          icon={Shield}
          action={
            <button type="button" className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              Add First Team
            </button>
          }
        />
      ) : (
        <div className="grid-3">
          {filteredTeams.map((team) => {
            const venueName =
              venues.find((v) => v.venue_id === team.home_venue_id)?.venue_name ||
              team.venue_name ||
              'Not assigned';

            return (
              <div key={team.team_id} className="card" style={{ padding: 0 }}>
                {/* Banner Header with Jersey Color */}
                <div
                  style={{
                    height: '75px',
                    background: `linear-gradient(135deg, ${getJerseyColorHex(team.jersey_color, '#1e293b')} 0%, #0f1629 100%)`,
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      background: 'rgba(0,0,0,0.4)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      color: '#ffffff',
                    }}
                  >
                    {team.short_name}
                  </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div
                      className="team-color-indicator"
                      style={{ backgroundColor: getJerseyColorHex(team.jersey_color) }}
                      title={`Jersey Color: ${team.jersey_color}`}
                    />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: getJerseyColorHex(team.jersey_color) }}>
                      {team.team_name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '1rem 0', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <MapPin size={15} color="var(--text-muted)" />
                      <span>{team.city} &bull; Home: {venueName}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <User size={15} color="var(--text-muted)" />
                      <span>Head Coach: <strong style={{ color: 'var(--text-primary)' }}>{team.coach || 'Unassigned'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <User size={15} color="var(--text-muted)" />
                      <span>Captain: <strong style={{ color: 'var(--text-primary)' }}>{team.captain_name || 'Unassigned'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Calendar size={15} color="var(--text-muted)" />
                      <span>Founded: {team.founded_year || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                      <Shield size={15} color="var(--text-muted)" />
                      <span>Titles won: {team.titles_won ?? 0}</span>
                    </div>

                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-icon primary"
                      onClick={() => handleOpenView(team)}
                      title="View Details & Squad"
                    >
                      <Eye size={17} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleOpenEdit(team)}
                      title="Edit Franchise"
                    >
                      <Edit2 size={17} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={() => handleOpenDelete(team)}
                      title="Delete Franchise"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Team Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedTeam ? `Edit Team: ${selectedTeam.team_name}` : 'Create New IPL Franchise'}
        size="md"
      >
        <form onSubmit={handleSaveTeam}>
          <div className="form-row">
            <FormField label="Franchise Name" error={formErrors.team_name} required>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mumbai Indians"
                maxLength={150}
                value={formData.team_name}
                onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
              />
            </FormField>
            <FormField label="Short Code" error={formErrors.short_name} required>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. MI"
                maxLength={10}
                value={formData.short_name}
                onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Home City" error={formErrors.city} required>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mumbai"
                maxLength={100}
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </FormField>
            <FormField label="Home Stadium / Venue">
              <select
                className="form-control"
                value={formData.home_venue_id}
                onChange={(e) => setFormData({ ...formData, home_venue_id: e.target.value })}
              >
                <option value="">Select Home Venue</option>
                {venues.map((venue) => (
                  <option key={venue.venue_id} value={venue.venue_id}>
                    {venue.venue_name} ({venue.city})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Head Coach">
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mark Boucher"
                maxLength={100}
                value={formData.coach}
                onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
              />
            </FormField>
            <FormField label="Founded Year" error={formErrors.founded_year}>
              <input
                type="number"
                className="form-control"
                placeholder="2008"
                min="1900"
                max="2100"
                step="1"
                value={formData.founded_year}
                onChange={(e) => setFormData({ ...formData, founded_year: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Titles Won" error={formErrors.titles_won}>
              <input
                type="number"
                className="form-control"
                min="0"
                max="255"
                step="1"
                value={formData.titles_won}
                onChange={(e) => setFormData({ ...formData, titles_won: e.target.value })}
              />
            </FormField>
            <FormField label="Jersey Color" error={formErrors.jersey_color} required>
              <select
                className="form-control"
                value={formData.jersey_color}
                onChange={(e) => setFormData({ ...formData, jersey_color: e.target.value })}
              >
                {JERSEY_COLORS.map(({ name, hex }) => (
                  <option key={name} value={name} style={{ color: hex }}>{name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Team Captain">
              <select
                className="form-control"
                value={formData.captain_id}
                disabled={!selectedTeam || captainLoading}
                onChange={(e) => setFormData({ ...formData, captain_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {captainOptions.map((player) => (
                  <option key={player.player_id} value={player.player_id}>{player.player_name}</option>
                ))}
              </select>
              {!selectedTeam && (
                <small style={{ color: 'var(--text-muted)' }}>Add players to this team, then edit it to choose a captain.</small>
              )}
            </FormField>
          </div>

          <div className="modal-footer" style={{ padding: '1rem 0 0', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : selectedTeam ? 'Update Team' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Team Details & Squad Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={selectedTeam ? `${selectedTeam.team_name} (${selectedTeam.short_name})` : 'Team Profile'}
        size="lg"
      >
        {selectedTeam && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1.25rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '12px',
                  backgroundColor: getJerseyColorHex(selectedTeam.jersey_color),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#ffffff',
                }}
              >
                {selectedTeam.short_name}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: getJerseyColorHex(selectedTeam.jersey_color) }}>{selectedTeam.team_name}</h4>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={13} /> {selectedTeam.city}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={13} /> Coach: {selectedTeam.coach || 'N/A'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={13} /> Captain: {selectedTeam.captain_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--accent-secondary)" />
                  Roster Squad Players ({teamPlayers.length})
                </h4>
              </div>

              {loadingPlayers ? (
                <LoadingSpinner message="Fetching roster..." />
              ) : teamPlayers.length === 0 ? (
                <EmptyState message="No players registered under this franchise yet." icon={Users} />
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Player Name</th>
                        <th>Role</th>
                        <th>Nationality</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers.map((player) => (
                        <tr key={player.player_id}>
                          <td>{player.jersey_no ?? '-'}</td>
                          <td className="text-primary">{player.player_name}</td>
                          <td>
                            <Badge variant="purple" label={player.role} />
                          </td>
                          <td>{player.nationality}</td>
                          <td>
                            <Badge
                              variant={player.is_active ? 'success' : 'danger'}
                              label={player.is_active ? 'Active' : 'Inactive'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteTeam}
        title="Delete Franchise"
        message={`Permanently delete "${selectedTeam?.team_name}" and its linked matches, scorecards, innings, and match assignments? Players will be kept but unassigned; optional owner and season references will be cleared.`}
        loading={submitting}
      />
    </div>
  );
};

export default Teams;
