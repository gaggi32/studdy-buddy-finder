import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize the API error so components can render `err.message` directly.
api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Unexpected error';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }).then((r) => r.data),
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data)
};

export const profileApi = {
  get: (userId) => api.get(`/users/${userId}`).then((r) => r.data.user),
  saveProfile: (userId, data) =>
    api.put(`/users/${userId}/profile`, data).then((r) => r.data.user),
  saveSubjects: (userId, subjects, learningGoals) =>
    api.put(`/users/${userId}/subjects`, { subjects, learningGoals }).then((r) => r.data.user),
  saveAvailability: (userId, availability) =>
    api.put(`/users/${userId}/availability`, { availability }).then((r) => r.data.user),
  // US-11: activate / deactivate the account with one call.
  setAccountStatus: (userId, status) =>
    api.put(`/users/${userId}/account`, { status }).then((r) => r.data.user),
  // US-12: pause the profile for a number of days (auto-reactivates), or resume early.
  pauseProfile: (userId, days) =>
    api.put(`/users/${userId}/pause`, { days }).then((r) => r.data.user),
  resumeProfile: (userId) =>
    api.delete(`/users/${userId}/pause`).then((r) => r.data.user),
  // US-13: permanently delete the account and all associated data.
  deleteAccount: (userId) =>
    api.delete(`/users/${userId}`).then(() => true),
  // US-06: block / unblock a user.
  blockUser: (userId, targetId) =>
    api.post(`/users/${userId}/block`, { targetId }).then((r) => r.data.user),
  unblockUser: (userId, targetId) =>
    api.delete(`/users/${userId}/block/${targetId}`).then((r) => r.data.user)
};

// US-06 / US-07: suggested study partners.
export const matchApi = {
  list: () => api.get('/matches').then((r) => r.data.matches)
};

// US-08 / US-09: contact requests and private chat.
export const connectionApi = {
  list: () => api.get('/connections').then((r) => r.data.connections),
  get: (id) => api.get(`/connections/${id}`).then((r) => r.data.connection),
  // US-08: send the first message to a suggested partner.
  send: (recipientId, message) =>
    api.post('/connections', { recipientId, message }).then((r) => r.data.connection),
  accept: (id) => api.post(`/connections/${id}/accept`).then((r) => r.data.connection),
  decline: (id) => api.post(`/connections/${id}/decline`).then((r) => r.data.connection),
  messages: (id) =>
    api.get(`/connections/${id}/messages`).then((r) => r.data),
  // US-09: send a message in the private chat.
  sendMessage: (id, body) =>
    api.post(`/connections/${id}/messages`, { body }).then((r) => r.data.message)
};

export default api;
