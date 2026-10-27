import axios from 'axios';

const api = axios.create({
  baseURL: '/api',   // Vite proxy forwards /api → http://localhost:5000/api (no CORS)
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Response interceptor to unwrap data and handle error messages cleanly
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const validationDetails = error.response?.data?.errors;
    const details = Array.isArray(validationDetails)
      ? validationDetails
        .map(({ field, message: detail }) => field ? `${field}: ${detail}` : detail)
        .join('; ')
      : '';
    const responseMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    const message = details ? `${responseMessage} ${details}` : responseMessage;
    return Promise.reject(new Error(message));
  }
);

// 1. Teams API
export const teamsAPI = {
  getAll: (params) => api.get('/teams', { params }),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  getPlayers: (id) => api.get(`/teams/${id}/players`),
  getMatches: (id) => api.get(`/teams/${id}/matches`),
};

// 2. Players API
export const playersAPI = {
  getAll: (params) => api.get('/players', { params }),
  getById: (id) => api.get(`/players/${id}`),
  create: (data) => api.post('/players', data),
  update: (id, data) => api.put(`/players/${id}`, data),
  delete: (id) => api.delete(`/players/${id}`),
  getStats: (id) => api.get(`/players/${id}/stats`),
};

// Player totals are derived from player_match scorecards where available.
export const playerStatisticsAPI = {
  getAll: () => api.get('/player-statistics'),
  getMatchRecords: () => api.get('/player-statistics/records'),
  createMatchRecord: (data) => api.post('/player-statistics/records', data),
  updateMatchRecord: (id, data) => api.put(`/player-statistics/records/${id}`, data),
  deleteMatchRecord: (id) => api.delete(`/player-statistics/records/${id}`),
};

// 3. Matches API
export const matchesAPI = {
  getAll: (params) => api.get('/matches', { params }),
  getById: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post('/matches', data),
  update: (id, data) => api.put(`/matches/${id}`, data),
  delete: (id) => api.delete(`/matches/${id}`),
  getInnings: (id) => api.get(`/matches/${id}/innings`),
  getUmpires: (id) => api.get(`/matches/${id}/umpires`),
  addUmpire: (id, data) => api.post(`/matches/${id}/umpires`, data),
  removeUmpire: (id, umpireId) => api.delete(`/matches/${id}/umpires/${umpireId}`),
};

// 4. Seasons API
export const seasonsAPI = {
  getAll: (params) => api.get('/seasons', { params }),
  getById: (id) => api.get(`/seasons/${id}`),
  create: (data) => api.post('/seasons', data),
  update: (id, data) => api.put(`/seasons/${id}`, data),
  delete: (id) => api.delete(`/seasons/${id}`),
  getMatches: (id) => api.get(`/seasons/${id}/matches`),
};

// 5. Venues API
export const venuesAPI = {
  getAll: (params) => api.get('/venues', { params }),
  getById: (id) => api.get(`/venues/${id}`),
  create: (data) => api.post('/venues', data),
  update: (id, data) => api.put(`/venues/${id}`, data),
  delete: (id) => api.delete(`/venues/${id}`),
  getMatches: (id) => api.get(`/venues/${id}/matches`),
};

// 6. Umpires API
export const umpiresAPI = {
  getAll: (params) => api.get('/umpires', { params }),
  getById: (id) => api.get(`/umpires/${id}`),
  create: (data) => api.post('/umpires', data),
  update: (id, data) => api.put(`/umpires/${id}`, data),
  delete: (id) => api.delete(`/umpires/${id}`),
};

// 7. Sponsors API
export const sponsorsAPI = {
  getAll: (params) => api.get('/sponsors', { params }),
  getById: (id) => api.get(`/sponsors/${id}`),
  create: (data) => api.post('/sponsors', data),
  update: (id, data) => api.put(`/sponsors/${id}`, data),
  delete: (id) => api.delete(`/sponsors/${id}`),
  getTeams: (id) => api.get(`/sponsors/${id}/teams`),
  addTeam: (id, data) => api.post(`/sponsors/${id}/teams`, data),
  removeTeam: (id, teamId) => api.delete(`/sponsors/${id}/teams/${teamId}`),
};

// 8. Awards API
export const awardsAPI = {
  getAll: (params) => api.get('/awards', { params }),
  getById: (id) => api.get(`/awards/${id}`),
  create: (data) => api.post('/awards', data),
  update: (id, data) => api.put(`/awards/${id}`, data),
  delete: (id) => api.delete(`/awards/${id}`),
  getWinners: (id) => api.get(`/awards/${id}/winners`),
  assignAward: (id, data) => api.post(`/awards/${id}/winners`, data),
};

// 9. Innings API
export const inningsAPI = {
  getAll: (params) => api.get('/innings', { params }),
  getById: (id) => api.get(`/innings/${id}`),
  create: (data) => api.post('/innings', data),
  update: (id, data) => api.put(`/innings/${id}`, data),
  delete: (id) => api.delete(`/innings/${id}`),
};

// 10. Owners API
export const ownersAPI = {
  getAll: (params) => api.get('/owners', { params }),
  getById: (id) => api.get(`/owners/${id}`),
  create: (data) => api.post('/owners', data),
  update: (id, data) => api.put(`/owners/${id}`, data),
  delete: (id) => api.delete(`/owners/${id}`),
};

// 11. Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentMatches: () => api.get('/dashboard/recent-matches'),
  getTopTeams: () => api.get('/dashboard/top-teams'),
  getUpcomingMatches: () => api.get('/dashboard/upcoming-matches'),
};

// 12. Reports API — paths match the routes registered in server/src/routes/reports.js
export const reportsAPI = {
  // Team overview: squad sizes + wins (joins team-players & team-wins data)
  getTeamStats:    () => api.get('/reports/team-players'),
  getTeamWins:     () => api.get('/reports/team-wins'),
  getMatchesPerTeam: () => api.get('/reports/matches-per-team'),

  // Leaderboards
  getTopBatsmen:   () => api.get('/reports/top-batsmen'),
  getTopBowlers:   () => api.get('/reports/top-bowlers'),
  getPomAwards:    () => api.get('/reports/player-of-match'),

  // Aggregates
  getVenueStats:   () => api.get('/reports/venue-matches'),
  getSeasonSummary: () => api.get('/reports/season-summary'),
};

export const teamStatisticsAPI = {
  getAll: (params) => api.get('/team-statistics', { params }),
};

export default api;
