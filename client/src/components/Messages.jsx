import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectionApi } from '../api.js';
import Toast from './Toast.jsx';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Messages() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    return connectionApi
      .list()
      .then(setConnections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function respond(id, action) {
    setBusyId(id);
    try {
      const updated = action === 'accept'
        ? await connectionApi.accept(id)
        : await connectionApi.decline(id);
      setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setToast(action === 'accept' ? 'Connected! You can chat now.' : 'Request declined');
      if (action === 'accept') navigate(`/messages/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="page-wrap"><div className="empty-state">Loading messages…</div></div>;
  }

  const incoming = connections.filter((c) => c.role === 'recipient' && c.status === 'pending');
  const active = connections.filter((c) => c.status === 'accepted');
  const sent = connections.filter((c) => c.role === 'requester' && c.status === 'pending');

  return (
    <div className="page-wrap">
      <Toast message={toast} onDone={() => setToast('')} />

      <div className="dashboard-hero">
        <div>
          <h1>Messages</h1>
          <p className="muted">Requests and your private chats.</p>
        </div>
        <Link to="/matches"><button className="btn btn-ghost">🔍 Find partners</button></Link>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* US-08: incoming contact requests land here */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">📥</span> Requests</span>
          {incoming.length > 0 && <span className="count-badge">{incoming.length}</span>}
        </div>
        {incoming.length === 0 ? (
          <div className="empty-state">No new requests.</div>
        ) : (
          <div className="convo-list">
            {incoming.map((c) => (
              <div className="convo-row" key={c.id}>
                <div className="convo-avatar">{c.partnerName[0]}</div>
                <div className="convo-main">
                  <div className="convo-name">
                    {c.partnerName}
                    {c.anonymized && <span className="anon-badge">anonymous</span>}
                  </div>
                  {c.lastMessage && <div className="convo-preview">"{c.lastMessage.body}"</div>}
                </div>
                <div className="convo-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={busyId === c.id}
                    onClick={() => respond(c.id, 'accept')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={busyId === c.id}
                    onClick={() => respond(c.id, 'decline')}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* US-09: active private chats */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">💬</span> Conversations</span>
        </div>
        {active.length === 0 ? (
          <div className="empty-state">No active chats yet. Accept a request to start chatting.</div>
        ) : (
          <div className="convo-list">
            {active.map((c) => (
              <Link className="convo-row convo-link" key={c.id} to={`/messages/${c.id}`}>
                <div className="convo-avatar">{c.partnerName[0]}</div>
                <div className="convo-main">
                  <div className="convo-name">{c.partnerName}</div>
                  {c.lastMessage && (
                    <div className="convo-preview">
                      {c.lastMessage.fromMe ? 'You: ' : ''}{c.lastMessage.body}
                    </div>
                  )}
                </div>
                <div className="convo-time">{c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing requests still awaiting a response */}
      {sent.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">📤</span> Sent</span>
          </div>
          <div className="convo-list">
            {sent.map((c) => (
              <div className="convo-row" key={c.id}>
                <div className="convo-avatar">{c.partnerName[0]}</div>
                <div className="convo-main">
                  <div className="convo-name">
                    {c.partnerName}
                    {c.anonymized && <span className="anon-badge">anonymous</span>}
                  </div>
                  <div className="convo-preview">Waiting for a response…</div>
                </div>
                <span className="status-pill">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
