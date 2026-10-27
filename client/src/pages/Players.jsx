import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { playersAPI, teamsAPI } from '../services/api';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchFilter from '../components/SearchFilter';
import FormField from '../components/FormField';
import Badge from '../components/Badge';
import Pagination from '../components/Pagination';
import { getJerseyColorHex } from '../constants/teamColors';

const initialPlayerForm = {
  player_name: '',
  dob: '',
  nationality: 'Indian',
  role: 'Batsman',
  batting_style: 'Right-Hand',
  bowling_style: '',
  team_id: '',
  jersey_no: '',
  is_active: 1,
};

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Form State
  const [formData, setFormData] = useState(initialPlayerForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchPlayersAndTeams = useCallback(async () => {
    try {
      setLoading(true);
      const [playersRes, teamsRes] = await Promise.all([
        playersAPI.getAll(),
        teamsAPI.getAll(),
      ]);
      setPlayers(playersRes.data.data || []);
      setTeams(teamsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load players roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayersAndTeams();
    const handleRefresh = () => fetchPlayersAndTeams();
    window.addEventListener('ipl-data-refresh', handleRefresh);
    return () => window.removeEventListener('ipl-data-refresh', handleRefresh);
  }, [fetchPlayersAndTeams]);

  const handleOpenAdd = () => {
    setSelectedPlayer(null);
    setFormData(initialPlayerForm);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (player) => {
    setSelectedPlayer(player);
    setFormData({
      player_name: player.player_name || '',
      dob: player.dob ? player.dob.split('T')[0] : '',
      nationality: player.nationality || 'Indian',
      role: player.role || 'Batsman',
      batting_style: player.batting_style || 'Right-Hand',
      bowling_style: player.bowling_style || '',
      team_id: player.team_id || '',
      jersey_no: player.jersey_no ?? '',
      is_active: player.is_active !== undefined ? Number(player.is_active) : 1,
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenView = (player) => {
    setSelectedPlayer(player);
    setIsViewOpen(true);
  };

  const handleOpenDelete = (player) => {
    setSelectedPlayer(player);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.player_name.trim()) errors.player_name = 'Player name is required';
    else if (formData.player_name.trim().length > 150) errors.player_name = 'Player name cannot exceed 150 characters';
    if (!formData.nationality.trim()) errors.nationality = 'Nationality is required';
    else if (formData.nationality.trim().length > 100) errors.nationality = 'Nationality cannot exceed 100 characters';
    if (!formData.role) errors.role = 'Role is required';
    if (formData.bowling_style.trim().length > 100) {
      errors.bowling_style = 'Bowling style cannot exceed 100 characters';
    }
    if (formData.jersey_no !== '' && (
      !Number.isInteger(Number(formData.jersey_no))
      || Number(formData.jersey_no) < 0
      || Number(formData.jersey_no) > 99
    )) {
      errors.jersey_no = 'Jersey number must be 0-99';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        team_id: formData.team_id ? Number(formData.team_id) : null,
        jersey_no: formData.jersey_no !== '' ? Number(formData.jersey_no) : null,
        dob: formData.dob || null,
        is_active: Number(formData.is_active),
      };

      if (selectedPlayer) {
        await playersAPI.update(selectedPlayer.player_id, payload);
        toast.success(`Player "${formData.player_name}" updated!`);
      } else {
        await playersAPI.create(payload);
        toast.success(`Player "${formData.player_name}" added!`);
      }
      setIsFormOpen(false);
      fetchPlayersAndTeams();
    } catch (error) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (!selectedPlayer) return;
    setSubmitting(true);
    try {
      await playersAPI.delete(selectedPlayer.player_id);
      toast.success(`Player "${selectedPlayer.player_name}" deleted.`);
      setIsDeleteOpen(false);
      fetchPlayersAndTeams();
    } catch (error) {
      toast.error(error.message || 'Failed to delete player');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.player_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.nationality?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTeam = teamFilter ? String(player.team_id) === String(teamFilter) : true;
    const matchesRole = roleFilter ? player.role === roleFilter : true;

    return matchesSearch && matchesTeam && matchesRole;
  });

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = filteredPlayers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const teamOptions = teams.map((t) => ({ label: `${t.team_name} (${t.short_name})`, value: String(t.team_id) }));
  const roleOptions = [
    { label: 'Batsman', value: 'Batsman' },
    { label: 'Bowler', value: 'Bowler' },
    { label: 'All-Rounder', value: 'All-Rounder' },
    { label: 'Wicket-Keeper', value: 'Wicket-Keeper' },
  ];

  const columns = [
    {
      key: 'player_name',
      label: 'Player',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {row.jersey_no !== null && row.jersey_no !== undefined && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              #{row.jersey_no}
            </span>
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.player_name}</span>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (val) => {
        let variant = 'info';
        if (val === 'All-Rounder') variant = 'warning';
        if (val === 'Bowler') variant = 'danger';
        if (val === 'Wicket-Keeper') variant = 'purple';
        return <Badge variant={variant} label={val} />;
      },
    },
    {
      key: 'team_name',
      label: 'Franchise',
      render: (_, row) => {
        const teamObj = teams.find((t) => String(t.team_id) === String(row.team_id));
        const name = row.team_short || row.team_name || teamObj?.short_name || 'Free Agent';
        return (
          <span style={{ fontWeight: 500, color: getJerseyColorHex(teamObj?.jersey_color, 'var(--text-secondary)') }}>
            {name}
          </span>
        );
      },
    },
    {
      key: 'nationality',
      label: 'Nationality',
      render: (val) => val || 'Indian',
    },
    {
      key: 'batting_style',
      label: 'Batting / Bowling',
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {row.batting_style || 'Right-Hand'} {row.bowling_style ? `• ${row.bowling_style}` : ''}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={Number(val) === 1 ? 'success' : 'default'}
          label={Number(val) === 1 ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-icon primary"
            onClick={() => handleOpenView(row)}
            title="View Player Profile"
          >
            <Eye size={16} />
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => handleOpenEdit(row)}
            title="Edit Player"
          >
            <Edit2 size={16} />
          </button>
          <button
            type="button"
            className="btn-icon danger"
            onClick={() => handleOpenDelete(row)}
            title="Delete Player"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Players Roster</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage player details and team assignments.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          <span>Add New Player</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <SearchFilter
        value={searchTerm}
        onChange={(val) => {
          setSearchTerm(val);
          setCurrentPage(1);
        }}
        placeholder="Search players by name, nationality, or team..."
        filters={[
          {
            key: 'team',
            label: 'All Teams',
            options: teamOptions,
            value: teamFilter,
          },
          {
            key: 'role',
            label: 'All Roles',
            options: roleOptions,
            value: roleFilter,
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'team') setTeamFilter(val);
          if (key === 'role') setRoleFilter(val);
          setCurrentPage(1);
        }}
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={paginatedPlayers}
        loading={loading}
        emptyMessage="No players found matching your filters."
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedPlayer ? `Edit Player: ${selectedPlayer.player_name}` : 'Register New Player'}
        size="md"
      >
        <form onSubmit={handleSavePlayer}>
          <div className="form-row">
            <FormField label="Full Name" error={formErrors.player_name} required>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Virat Kohli"
                value={formData.player_name}
                onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
              />
            </FormField>
            <FormField label="Nationality" error={formErrors.nationality} required>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Indian"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Role / Specialization" error={formErrors.role} required>
              <select
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="Batsman">Batsman</option>
                <option value="Bowler">Bowler</option>
                <option value="All-Rounder">All-Rounder</option>
                <option value="Wicket-Keeper">Wicket-Keeper</option>
              </select>
            </FormField>
            <FormField label="Assign to Franchise">
              <select
                className="form-control"
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              >
                <option value="">Unassigned (Free Agent)</option>
                {teams.map((t) => (
                  <option key={t.team_id} value={t.team_id}>
                    {t.team_name} ({t.short_name})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Batting Style">
              <select
                className="form-control"
                value={formData.batting_style}
                onChange={(e) => setFormData({ ...formData, batting_style: e.target.value })}
              >
                <option value="Right-Hand">Right-Hand</option>
                <option value="Left-Hand">Left-Hand</option>
              </select>
            </FormField>
            <FormField label="Bowling Style" error={formErrors.bowling_style}>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Right-arm fast, Off-break"
                value={formData.bowling_style}
                onChange={(e) => setFormData({ ...formData, bowling_style: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Jersey No" error={formErrors.jersey_no}>
              <input
                type="number"
                min="0"
                max="99"
                className="form-control"
                placeholder="e.g. 18"
                value={formData.jersey_no}
                onChange={(e) => setFormData({ ...formData, jersey_no: e.target.value })}
              />
            </FormField>
          </div>

          <div className="form-row">
            <FormField label="Date of Birth">
              <input
                type="date"
                className="form-control"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </FormField>
            <FormField label="Player Status">
              <select
                className="form-control"
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
              >
                <option value="1">Active / Available</option>
                <option value="0">Inactive / Injured</option>
              </select>
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
              {submitting ? 'Saving...' : selectedPlayer ? 'Update Player' : 'Register Player'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View player details */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title={selectedPlayer ? `${selectedPlayer.player_name}` : 'Player Profile'}
        size="md"
      >
        {selectedPlayer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                {selectedPlayer.jersey_no ?? '#'}
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{selectedPlayer.player_name}</h4>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <Badge variant="purple" label={selectedPlayer.role} />
                  <Badge variant="info" label={selectedPlayer.nationality || 'Indian'} />
                  <Badge
                    variant={selectedPlayer.is_active ? 'success' : 'default'}
                    label={selectedPlayer.is_active ? 'Active' : 'Inactive'}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Batting Style</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedPlayer.batting_style || 'Right-Hand'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bowling Style</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedPlayer.bowling_style || 'None'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Franchise</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {selectedPlayer.team_name || teams.find((t) => t.team_id === selectedPlayer.team_id)?.team_name || 'Free Agent'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)' }}>Birth Date</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {selectedPlayer.dob ? new Date(selectedPlayer.dob).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeletePlayer}
        title="Delete Player Record"
        message={`Are you sure you want to delete "${selectedPlayer?.player_name}"? This will also remove their match performance records.`}
        loading={submitting}
      />
    </div>
  );
};

export default Players;
