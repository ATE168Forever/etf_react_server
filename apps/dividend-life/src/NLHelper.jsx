import { useState, useEffect, useRef } from 'react';
import { API_HOST } from '../config';
import { useLanguage } from './i18n';

// Simple text formatter: converts **bold** and newlines to JSX
function FormattedReply({ text }) {
  if (!text) return null;
  return (
    <div className="nl-helper-reply">
      {text.split('\n').map((line, i) => {
        // Convert **text** to <strong>
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        );
        return <p key={i} className="nl-helper-reply-line">{rendered}</p>;
      })}
    </div>
  );
}

function NLHelper() {
  const { lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]); // [{role:'user'|'assistant', text, toolsUsed?}]
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleBtnRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Scroll to latest message
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await fetch(`${API_HOST}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, lang }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.reply, toolsUsed: data.tools_used || [] },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: lang === 'en' ? `Error: ${err.message}` : `錯誤：${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => setMessages([]);

  const toggleOpen = () => setOpen(o => !o);

  return (
    <>
      <div
        className={`nl-helper ${open ? 'open' : ''}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="nl-helper-header">
          <span className="nl-helper-title">
            {lang === 'en' ? 'ETF Assistant' : 'ETF 助理'}
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              className="nl-helper-clear"
              onClick={handleClear}
              aria-label={lang === 'en' ? 'Clear conversation' : '清除對話'}
            >
              {lang === 'en' ? 'Clear' : '清除'}
            </button>
          )}
        </div>

        <div
          className="nl-helper-messages"
          role="log"
          aria-live="polite"
          aria-label={lang === 'en' ? 'Conversation history' : '對話記錄'}
        >
          {messages.length === 0 && (
            <p className="nl-helper-empty">
              {lang === 'en'
                ? 'Ask about ETF dividends, yields, returns…'
                : '詢問 ETF 配息、殖利率、報酬率…'}
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`nl-helper-msg nl-helper-msg--${msg.role}`}>
              {msg.role === 'assistant' ? (
                <>
                  <FormattedReply text={msg.text} />
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <p className="nl-helper-tools-used">
                      {lang === 'en' ? 'Tools: ' : '使用工具：'}
                      {msg.toolsUsed.join(', ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="nl-helper-msg-text">{msg.text}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="nl-helper-msg nl-helper-msg--assistant" aria-label={lang === 'en' ? 'Loading' : '載入中'}>
              <p className="nl-helper-thinking">
                {lang === 'en' ? 'Thinking…' : '思考中…'}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="nl-helper-input-row">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={lang === 'en' ? 'Ask about any ETF…' : '詢問任何 ETF 問題…'}
            aria-label={lang === 'en' ? 'ETF assistant query' : 'ETF 助理查詢'}
            rows={2}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
            }}
          />
          <button type="button" onClick={handleSubmit} disabled={loading || !query.trim()}>
            {loading
              ? (lang === 'en' ? '…' : '…')
              : (lang === 'en' ? 'Send' : '送出')}
          </button>
        </div>
        <p className="nl-helper-hint">
          {lang === 'en' ? 'Ctrl+Enter to send' : 'Ctrl+Enter 送出'}
        </p>
      </div>

      <button
        type="button"
        className="nl-helper-toggle"
        ref={toggleBtnRef}
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={
          open
            ? (lang === 'en' ? 'Close assistant' : '關閉助理')
            : (lang === 'en' ? 'Open assistant' : '開啟助理')
        }
      >
        {open ? '×' : '🤖'}
      </button>
    </>
  );
}

export default NLHelper;
