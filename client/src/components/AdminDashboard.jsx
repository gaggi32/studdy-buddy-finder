import { useEffect, useState } from 'react';
import { adminApi } from '../api.js';
import Toast from './Toast.jsx';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLock(userId) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await adminApi.lockUser(userId);
      setToast('Benutzer erfolgreich gesperrt.');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  async function handleUnlock(userId) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await adminApi.unlockUser(userId);
      setToast('Sperre erfolgreich aufgehoben.');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionBusy(false);
    }
  }

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active' || !u.status).length,
    locked: users.filter((u) => u.status === 'locked').length,
    deactivated: users.filter((u) => u.status === 'deactivated').length
  };

  // Filter and search
  const filteredUsers = users.filter((u) => {
    const name = `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());

    const status = u.status || 'active';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-wrap">
      <Toast message={toast} onDone={() => setToast('')} />

      <div className="dashboard-hero">
        <div>
          <h1>Administration</h1>
          <p className="muted">Verwalten Sie Benutzerprofile und Systemsperren.</p>
        </div>
        <button className="btn btn-ghost" onClick={loadUsers} disabled={loading}>
          🔄 Aktualisieren
        </button>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Stats Cards */}
      <div className="quick-actions" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 0, textAlign: 'center' }}>
          <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Gesamt</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '4px 0' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 0, textAlign: 'center', borderColor: '#34d39944' }}>
          <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Aktiv</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399', margin: '4px 0' }}>{stats.active}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 0, textAlign: 'center', borderColor: '#fbbf2444' }}>
          <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Deaktiviert</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', margin: '4px 0' }}>{stats.deactivated}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', marginBottom: 0, textAlign: 'center', borderColor: 'var(--danger)' }}>
          <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Gesperrt</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--danger)', margin: '4px 0' }}>{stats.locked}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="filter-controls">
          <div className="field">
            <label className="field-label">Suche</label>
            <input
              type="text"
              placeholder="Name oder E-Mail eingeben..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Alle Zustände</option>
              <option value="active">Aktiv</option>
              <option value="deactivated">Deaktiviert</option>
              <option value="locked">Gesperrt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="empty-state">Benutzerliste wird geladen…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">Keine Benutzer gefunden.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>E-Mail</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Rolle</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const status = u.status || 'active';
                  const isUserAdmin = !!u.isAdmin;
                  const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : '— (Kein Profil)';

                  let badgeStyle = { background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
                  if (status === 'active') badgeStyle = { background: '#1a3a2a', color: '#34d399', border: '1px solid #34d39930' };
                  if (status === 'deactivated') badgeStyle = { background: '#2a2a12', color: '#fbbf24', border: '1px solid #fbbf2430' };
                  if (status === 'locked') badgeStyle = { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid #f8717130' };

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{name}</td>
                      <td style={{ padding: '14px 16px' }}>{u.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        {isUserAdmin ? (
                          <span className="anon-badge" style={{ borderColor: 'var(--accent)', color: 'var(--accent-h)' }}>Admin</span>
                        ) : (
                          <span className="anon-badge">Student</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="level-badge" style={{ ...badgeStyle, textTransform: 'capitalize' }}>
                          {status === 'active' ? 'Aktiv' : status === 'deactivated' ? 'Deaktiviert' : status === 'locked' ? 'Gesperrt' : status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        {isUserAdmin ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Keine Aktionen</span>
                        ) : status === 'locked' ? (
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={actionBusy}
                            onClick={() => handleUnlock(u.id)}
                          >
                            🔓 Sperre aufheben
                          </button>
                        ) : (
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actionBusy}
                            onClick={() => handleLock(u.id)}
                          >
                            🚫 Sperren
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
