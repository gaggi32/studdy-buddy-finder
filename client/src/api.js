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
    api.put(`/users/${userId}/availability`, { availability }).then((r) => r.data.user)
};

export default api;
