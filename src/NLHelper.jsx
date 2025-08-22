import { useState } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';

function NLHelper() {
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
      <div className={`nl-helper ${open ? 'open' : ''}`}>
        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="輸入查詢..."
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? '查詢中...' : '送出'}
        </button>
        <pre className="nl-helper-response">{response}</pre>
      </div>
      <button className="nl-helper-toggle" onClick={toggleOpen}>
        {open ? '×' : '🤖'}
      </button>
    </>
  );
}

export default NLHelper;
