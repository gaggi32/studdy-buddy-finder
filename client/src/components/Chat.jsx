import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { connectionApi } from '../api.js';

const MAX_LEN = 500;
const POLL_MS = 3000;

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { connectionId } = useParams();
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef(null);
  const prevCount = useRef(0);

  // Load the connection header once.
  useEffect(() => {
    let cancelled = false;
    connectionApi
      .get(connectionId)
      .then((c) => { if (!cancelled) setConnection(c); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [connectionId]);

  // Poll the message history so it updates in near real-time / on reload (US-09).
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const data = await connectionApi.messages(connectionId);
        if (cancelled) return;
        setStatus(data.status);
        setMessages(data.messages);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [connectionId]);

  // Keep the latest message in view when new ones arrive.
  useEffect(() => {
    if (messages.length !== prevCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: prevCount.current ? 'smooth' : 'auto' });
      prevCount.current = messages.length;
    }
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const msg = await connectionApi.sendMessage(connectionId, body);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const partnerName = connection?.partnerName || 'Chat';
  const locked = status && status !== 'accepted';

  return (
    <div className="page-wrap chat-page">
      <div className="chat-header">
        <Link to="/messages" className="btn btn-ghost btn-sm">← Back</Link>
        <div className="chat-peer">
          {connection && <div className="convo-avatar">{partnerName[0]}</div>}
          <div className="chat-peer-name">{partnerName}</div>
        </div>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {locked ? (
        <div className="card">
          <div className="empty-state">
            This chat isn't available. A private chat opens only after both of you confirm the connection.
          </div>
        </div>
      ) : (
        <div className="card chat-card">
          <div className="chat-messages">
            {loading ? (
              <div className="empty-state">Loading conversation…</div>
            ) : messages.length === 0 ? (
              <div className="empty-state">No messages yet. Say hello 👋</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`bubble-row ${m.fromMe ? 'mine' : 'theirs'}`}>
                  <div className="bubble">
                    <div className="bubble-body">{m.body}</div>
                    <div className="bubble-time">{formatTime(m.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input" onSubmit={send}>
            <textarea
              rows="1"
              maxLength={MAX_LEN}
              value={text}
              placeholder="Write a message…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
