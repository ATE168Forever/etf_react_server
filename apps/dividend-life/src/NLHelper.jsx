import { useState } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { useLanguage } from './i18n';

function NLHelper() {
  const { lang } = useLanguage();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const { data } = await fetchWithCache(
        `${API_HOST}/nl_query?q=${encodeURIComponent(query)}`
      );
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = () => setOpen(o => !o);

  return (
    <>
      <div className={`nl-helper ${open ? 'open' : ''}`} aria-hidden={!open}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={lang === 'en' ? 'Enter query...' : '輸入查詢...'}
        />
        <button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (lang === 'en' ? 'Searching...' : '查詢中...') : (lang === 'en' ? 'Submit' : '送出')}
        </button>
        <pre className="nl-helper-response">{response}</pre>
      </div>
      <button
        type="button"
        className="nl-helper-toggle"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? (lang === 'en' ? 'Close assistant' : '關閉助理') : (lang === 'en' ? 'Open assistant' : '開啟助理')}
      >
        {open ? '×' : '🤖'}
      </button>
    </>
  );
}

export default NLHelper;
