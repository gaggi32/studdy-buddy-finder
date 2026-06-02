require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const matchRoutes = require('./routes/matches');
const connectionRoutes = require('./routes/connections');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/connections', connectionRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Study Buddy API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
